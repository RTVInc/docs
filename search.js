/**
 * RTV Docs — search.js
 *
 * Cmd+K / Ctrl+K spotlight-style search across the documentation hub.
 * Loads search-index.json, renders a modal with live filtering, and
 * navigates to the selected page (optionally with a #hash anchor).
 *
 * Include this on every page with:
 *   <script src="search.js"></script>     (root pages)
 *   <script src="../search.js"></script>  (subdirectory pages)
 */
(function () {
  'use strict';

  /* ── Config ── */
  var INDEX_URL = (function () {
    // Resolve the index path relative to the docs root.
    // Pages at depth 1 (ids-docs/, implementation-docs/) need ../search-index.json
    var scripts = document.querySelectorAll('script[src*="search.js"]');
    var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : 'search.js';
    return src.replace('search.js', 'search-index.json');
  })();

  var ROOT_URL = (function () {
    var scripts = document.querySelectorAll('script[src*="search.js"]');
    var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : 'search.js';
    return src.replace('search.js', '');
  })();

  /* ── State ── */
  var _index = null;
  var _modal = null;
  var _input = null;
  var _list = null;
  var _active = -1;
  var _results = [];

  /* ── Load index ── */
  function loadIndex(cb) {
    if (_index) { cb(); return; }
    fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) { _index = data; cb(); })
      .catch(function () { _index = []; cb(); });
  }

  /* ── Scoring / search ── */
  function score(entry, q) {
    if (!q) return 1;
    var target = ((entry.title || '') + ' ' + (entry.heading || '') + ' ' + (entry.section || '')).toLowerCase();
    q = q.toLowerCase().trim();
    if (target.indexOf(q) !== -1) return 3;
    // Check all words present
    var words = q.split(/\s+/);
    var allPresent = words.every(function (w) { return target.indexOf(w) !== -1; });
    if (allPresent) return 2;
    // At least one word present
    var anyPresent = words.some(function (w) { return target.indexOf(w) !== -1; });
    if (anyPresent) return 1;
    return 0;
  }

  function search(q) {
    if (!_index) return [];
    var q2 = q.trim();
    var scored = [];
    for (var i = 0; i < _index.length; i++) {
      var s = score(_index[i], q2);
      if (s > 0) scored.push({ entry: _index[i], score: s });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      // Prefer page-level entries over sections
      if (a.entry.type === 'page' && b.entry.type !== 'page') return -1;
      if (b.entry.type === 'page' && a.entry.type !== 'page') return 1;
      // Prefer lower heading level (h1 < h2 < h3)
      return (a.entry.level || 99) - (b.entry.level || 99);
    });
    return scored.slice(0, 24).map(function (x) { return x.entry; });
  }

  function urlFor(entry) {
    var base = ROOT_URL + entry.file;
    if (entry.slug) base += '#' + entry.slug;
    return base;
  }

  /* ── Highlight matched query in text ── */
  function hl(text, q) {
    if (!q || !text) return text || '';
    var escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  /* ── Render results ── */
  function renderResults(q) {
    _results = search(q);
    _active = _results.length ? 0 : -1;

    _list.innerHTML = '';

    if (!q.trim()) {
      _list.innerHTML = '<div class="rtv-s-empty">Type to search across all docs…</div>';
      return;
    }
    if (!_results.length) {
      _list.innerHTML = '<div class="rtv-s-empty">No results for <strong>' + q + '</strong></div>';
      return;
    }

    _results.forEach(function (entry, i) {
      var li = document.createElement('div');
      li.className = 'rtv-s-item' + (i === _active ? ' rtv-s-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === _active ? 'true' : 'false');

      var label = entry.type === 'section'
        ? hl(entry.heading, q)
        : hl(entry.title, q);

      var meta = entry.type === 'section'
        ? entry.title + (entry.level ? ' · h' + entry.level : '')
        : entry.section;

      li.innerHTML =
        '<div class="rtv-s-label">' + label + '</div>' +
        '<div class="rtv-s-meta">' + meta + '</div>';

      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        navigate(entry);
      });
      li.addEventListener('mousemove', function () {
        setActive(i);
      });

      _list.appendChild(li);
    });
  }

  function setActive(i) {
    var items = _list.querySelectorAll('.rtv-s-item');
    if (_active >= 0 && items[_active]) {
      items[_active].classList.remove('rtv-s-active');
      items[_active].setAttribute('aria-selected', 'false');
    }
    _active = i;
    if (_active >= 0 && items[_active]) {
      items[_active].classList.add('rtv-s-active');
      items[_active].setAttribute('aria-selected', 'true');
      items[_active].scrollIntoView({ block: 'nearest' });
    }
  }

  function navigate(entry) {
    var url = urlFor(entry);
    closeModal();
    window.location.href = url;
  }

  /* ── Build modal DOM ── */
  function buildModal() {
    if (_modal) return;

    var style = document.createElement('style');
    style.textContent = [
      /* Overlay */
      '#rtv-search-overlay {',
      '  position: fixed; inset: 0; z-index: 10000;',
      '  background: rgba(10,22,24,0.7); backdrop-filter: blur(4px);',
      '  display: flex; align-items: flex-start; justify-content: center;',
      '  padding-top: clamp(60px, 12vh, 140px);',
      '  animation: rtv-s-fade-in 0.12s ease;',
      '}',
      '@keyframes rtv-s-fade-in { from { opacity: 0; } to { opacity: 1; } }',

      /* Dialog */
      '#rtv-search-dialog {',
      '  width: 100%; max-width: 600px; margin: 0 20px;',
      '  background: #1a3638; border: 1px solid rgba(76,181,190,0.25);',
      '  border-radius: 12px; overflow: hidden;',
      '  box-shadow: 0 24px 64px rgba(0,0,0,0.55);',
      '  animation: rtv-s-slide-in 0.14s ease;',
      '}',
      '@keyframes rtv-s-slide-in { from { transform: translateY(-12px); opacity:0; } to { transform: translateY(0); opacity:1; } }',

      /* Input row */
      '#rtv-search-input-row {',
      '  display: flex; align-items: center; gap: 10px;',
      '  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.08);',
      '}',
      '#rtv-search-icon { color: rgba(76,181,190,0.7); flex-shrink: 0; }',
      '#rtv-search-input {',
      '  flex: 1; background: transparent; border: none; outline: none;',
      '  color: rgba(255,255,255,0.87); font-family: inherit; font-size: 16px;',
      '  caret-color: #4CB5BE;',
      '}',
      '#rtv-search-input::placeholder { color: rgba(255,255,255,0.3); }',
      '#rtv-search-esc {',
      '  font-size: 11px; font-weight: 600; letter-spacing: 0.05em;',
      '  color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.07);',
      '  padding: 2px 7px; border-radius: 4px; flex-shrink: 0; cursor: pointer;',
      '  border: none; font-family: inherit;',
      '}',

      /* Results list */
      '#rtv-search-list {',
      '  max-height: 400px; overflow-y: auto;',
      '  padding: 6px 0;',
      '}',
      '#rtv-search-list:empty { padding: 0; }',

      '.rtv-s-item {',
      '  padding: 10px 18px; cursor: pointer;',
      '  border-radius: 0; transition: background 0.1s;',
      '}',
      '.rtv-s-item.rtv-s-active, .rtv-s-item:hover { background: rgba(1,135,147,0.18); }',
      '.rtv-s-label { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.87); margin-bottom: 2px; }',
      '.rtv-s-label mark { background: transparent; color: #4CB5BE; font-weight: 700; }',
      '.rtv-s-meta { font-size: 12px; color: rgba(255,255,255,0.38); }',
      '.rtv-s-empty { padding: 20px 18px; font-size: 14px; color: rgba(255,255,255,0.38); }',
      '.rtv-s-empty strong { color: rgba(255,255,255,0.6); }',

      /* Footer hint */
      '#rtv-search-footer {',
      '  display: flex; align-items: center; gap: 12px;',
      '  padding: 10px 18px; border-top: 1px solid rgba(255,255,255,0.07);',
      '  font-size: 11px; color: rgba(255,255,255,0.28);',
      '}',
      '.rtv-s-kbd {',
      '  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);',
      '  border-radius: 3px; padding: 1px 5px; font-family: inherit; font-size: 11px;',
      '  color: rgba(255,255,255,0.4);',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'rtv-search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Search documentation');

    var dialog = document.createElement('div');
    dialog.id = 'rtv-search-dialog';

    var inputRow = document.createElement('div');
    inputRow.id = 'rtv-search-input-row';
    inputRow.innerHTML =
      '<svg id="rtv-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

    _input = document.createElement('input');
    _input.id = 'rtv-search-input';
    _input.type = 'text';
    _input.placeholder = 'Search docs…';
    _input.setAttribute('autocomplete', 'off');
    _input.setAttribute('autocorrect', 'off');
    _input.setAttribute('spellcheck', 'false');
    _input.setAttribute('role', 'combobox');
    _input.setAttribute('aria-expanded', 'true');
    _input.setAttribute('aria-autocomplete', 'list');

    var escBtn = document.createElement('button');
    escBtn.id = 'rtv-search-esc';
    escBtn.textContent = 'esc';
    escBtn.addEventListener('click', closeModal);

    inputRow.appendChild(_input);
    inputRow.appendChild(escBtn);

    _list = document.createElement('div');
    _list.id = 'rtv-search-list';
    _list.setAttribute('role', 'listbox');
    _list.innerHTML = '<div class="rtv-s-empty">Type to search across all docs…</div>';

    var footer = document.createElement('div');
    footer.id = 'rtv-search-footer';
    footer.innerHTML =
      '<span><kbd class="rtv-s-kbd">↑↓</kbd> navigate</span>' +
      '<span><kbd class="rtv-s-kbd">↵</kbd> open</span>' +
      '<span><kbd class="rtv-s-kbd">esc</kbd> close</span>';

    dialog.appendChild(inputRow);
    dialog.appendChild(_list);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    _modal = overlay;

    // Close on overlay click (outside dialog)
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) closeModal();
    });

    // Keyboard within input
    _input.addEventListener('input', function () {
      renderResults(_input.value);
    });

    _input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(_active + 1, _results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(_active - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_active >= 0 && _results[_active]) navigate(_results[_active]);
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  function openModal() {
    loadIndex(function () {
      buildModal();
      _modal.style.display = 'flex';
      _input.value = '';
      renderResults('');
      _input.focus();
    });
  }

  function closeModal() {
    if (_modal) _modal.style.display = 'none';
  }

  /* ── Global keyboard trigger ── */
  document.addEventListener('keydown', function (e) {
    // Cmd+K on Mac, Ctrl+K on Windows/Linux
    var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    var trigger = isMac ? (e.metaKey && e.key === 'k') : (e.ctrlKey && e.key === 'k');
    if (trigger) {
      e.preventDefault();
      if (_modal && _modal.style.display !== 'none') {
        closeModal();
      } else {
        openModal();
      }
    }
  });

  /* ── Search button injection ── */
  // Add a search button to the site header on all pages.
  // If the page already has a #rtv-search-trigger (e.g. the home page inlines one), just bind it.
  document.addEventListener('DOMContentLoaded', function () {
    var existing = document.getElementById('rtv-search-trigger');
    if (existing) {
      existing.addEventListener('click', openModal);
      return;
    }
    var header = document.querySelector('.site-header');
    if (!header) return;

    var btn = document.createElement('button');
    btn.id = 'rtv-search-trigger';
    btn.setAttribute('aria-label', 'Search documentation');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      '<span>Search</span>' +
      '<kbd>⌘K</kbd>';

    var btnStyle = document.createElement('style');
    btnStyle.textContent = [
      '#rtv-search-trigger {',
      '  display: inline-flex; align-items: center; gap: 7px;',
      '  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);',
      '  color: rgba(255,255,255,0.5); border-radius: 7px;',
      '  font-family: inherit; font-size: 12px; font-weight: 500;',
      '  padding: 5px 12px; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;',
      '  white-space: nowrap;',
      '}',
      '#rtv-search-trigger:hover { background: rgba(1,135,147,0.18); border-color: rgba(76,181,190,0.35); color: rgba(255,255,255,0.8); }',
      '#rtv-search-trigger kbd {',
      '  font-family: inherit; font-size: 10px; font-weight: 600;',
      '  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);',
      '  border-radius: 3px; padding: 1px 4px; color: rgba(255,255,255,0.35);',
      '}',
      '@media (max-width: 520px) { #rtv-search-trigger span, #rtv-search-trigger kbd { display: none; } }',
    ].join('\n');
    document.head.appendChild(btnStyle);

    btn.addEventListener('click', openModal);

    // Insert before the last element in the header (usually the back link)
    var children = header.children;
    var last = children[children.length - 1];
    header.insertBefore(btn, last);
  });

})();

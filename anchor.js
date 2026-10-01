/**
 * RTV Docs — anchor.js
 *
 * Adds slugified IDs to all h1/h2/h3 headings and to images with alt text,
 * injects a copy-link icon next to each, and scrolls to the element when
 * the URL hash matches on load or popstate.
 */
(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')   // strip non-word chars except hyphen
      .trim()
      .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphen
      .replace(/-{2,}/g, '-');    // collapse multiple hyphens
  }

  // Guarantee a unique id within this page.
  var seen = {};
  function uniqueSlug(base) {
    var s = base, n = 1;
    while (seen[s]) { s = base + '-' + (++n); }
    seen[s] = true;
    return s;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function buildAnchorIcon() {
    var btn = document.createElement('button');
    btn.className = 'rtv-anchor-btn';
    btn.title = 'Copy link to this section';
    btn.setAttribute('aria-label', 'Copy link to this section');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
      '</svg>';
    return btn;
  }

  function buildImageAnchorIcon() {
    var btn = document.createElement('button');
    btn.className = 'rtv-img-anchor-btn';
    btn.title = 'Copy link to this image';
    btn.setAttribute('aria-label', 'Copy link to this image');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
      '</svg>' +
      '<span>Copy image link</span>';
    return btn;
  }

  function showCopiedToast(anchor) {
    var existing = document.getElementById('rtv-copy-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'rtv-copy-toast';
    toast.textContent = 'Link copied';
    document.body.appendChild(toast);

    // Position near the anchor element
    var rect = anchor.getBoundingClientRect();
    var top  = Math.min(rect.top + window.scrollY - 36, document.documentElement.scrollHeight - 60);
    toast.style.top  = top + 'px';
    toast.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 160) + 'px';
    toast.style.opacity = '1';

    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }, 1600);
  }

  // ── Inject CSS ──────────────────────────────────────────────────────────────

  var style = document.createElement('style');
  style.textContent = [
    /* Headings: make position:relative so the icon can sit inline */
    'h1, h2, h3 { position: relative; }',

    /* The copy-link icon button */
    '.rtv-anchor-btn {',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  margin-left: 8px; padding: 3px 5px; vertical-align: middle;',
    '  background: transparent; border: none; cursor: pointer;',
    '  color: rgba(76,181,190,0.5);',
    '  opacity: 0; transition: opacity 0.15s, color 0.15s;',
    '  border-radius: 4px;',
    '}',
    'h1:hover .rtv-anchor-btn, h2:hover .rtv-anchor-btn, h3:hover .rtv-anchor-btn,',
    '.rtv-anchor-btn:focus { opacity: 1; }',
    '.rtv-anchor-btn:hover { color: rgba(76,181,190,1); }',

    /* Image wrapper and icon */
    '.rtv-img-wrap { position: relative; display: inline-block; max-width: 100%; }',
    '.rtv-img-anchor-btn {',
    '  position: absolute; bottom: 8px; right: 8px;',
    '  display: inline-flex; align-items: center; gap: 5px;',
    '  background: rgba(24,48,50,0.88); border: 1px solid rgba(76,181,190,0.3);',
    '  color: rgba(76,181,190,0.85); border-radius: 5px;',
    '  font-size: 11px; font-weight: 600; font-family: inherit;',
    '  padding: 4px 9px; cursor: pointer; transition: opacity 0.15s;',
    '  opacity: 0;',
    '}',
    '.rtv-img-wrap:hover .rtv-img-anchor-btn,',
    '.rtv-img-anchor-btn:focus { opacity: 1; }',

    /* Toast */
    '#rtv-copy-toast {',
    '  position: absolute; z-index: 9999;',
    '  background: rgba(1,135,147,0.92); color: #fff;',
    '  font-family: inherit; font-size: 12px; font-weight: 600;',
    '  padding: 5px 12px; border-radius: 5px;',
    '  pointer-events: none; transition: opacity 0.3s;',
    '  white-space: nowrap;',
    '}',

    /* Smooth scroll target highlight */
    ':target { scroll-margin-top: 80px; }',
  ].join('\n');
  document.head.appendChild(style);

  // ── Process headings ────────────────────────────────────────────────────────

  function processHeadings() {
    var headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(function (h) {
      // Skip headings already inside nav/sidebar/header elements
      if (h.closest('nav, header, .sidebar, .site-header')) return;

      // Derive slug from text content (strips child element text too)
      var text = h.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;

      var slug = h.id || uniqueSlug(slugify(text));
      if (!h.id) h.id = slug;
      else seen[slug] = true;

      var btn = buildAnchorIcon();
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var url = location.href.split('#')[0] + '#' + h.id;
        copyToClipboard(url).then(function () { showCopiedToast(btn); }).catch(function () { showCopiedToast(btn); });
        history.pushState(null, '', '#' + h.id);
      });
      h.appendChild(btn);
    });
  }

  // ── Process images ──────────────────────────────────────────────────────────

  function processImages() {
    var images = document.querySelectorAll('img[alt]');
    images.forEach(function (img) {
      var alt = (img.getAttribute('alt') || '').trim();
      if (!alt) return;

      var slug = uniqueSlug('img-' + slugify(alt));
      img.id = slug;

      // Wrap in a relative container so the button can be absolute-positioned
      var parent = img.parentNode;
      // Don't double-wrap
      if (parent && parent.classList && parent.classList.contains('rtv-img-wrap')) return;

      var wrap = document.createElement('span');
      wrap.className = 'rtv-img-wrap';
      parent.insertBefore(wrap, img);
      wrap.appendChild(img);

      var btn = buildImageAnchorIcon();
      wrap.appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var url = location.href.split('#')[0] + '#' + img.id;
        copyToClipboard(url).then(function () { showCopiedToast(btn); }).catch(function () { showCopiedToast(btn); });
        history.pushState(null, '', '#' + img.id);
      });
    });
  }

  // ── Scroll to hash ──────────────────────────────────────────────────────────

  function scrollToHash() {
    var hash = location.hash;
    if (!hash) return;
    var id = hash.slice(1);
    // Brief delay to let images load (especially in large guides)
    setTimeout(function () {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  function init() {
    processHeadings();
    processImages();
    scrollToHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('popstate', scrollToHash);
  window.addEventListener('hashchange', scrollToHash);

})();

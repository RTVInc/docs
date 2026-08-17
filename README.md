# Raising The Village — Documentation Hub

**Live site:** https://rtvinc.github.io/docs/

Central repository for technical documentation across all RTV program systems. Hosted via GitHub Pages from the `main` branch root.

---

## Structure

```
docs/
├── index.html                    ← Hub landing page (https://rtvinc.github.io/docs/)
├── README.md                     ← This file
│
├── ids-docs/                     ← Intelligent Design System
│   ├── index.html                ← IDS landing page
│   ├── guide.html                ← Full user guide (HTML, self-contained)
│   └── presentation.html        ← 12-slide onboarding deck (HTML, self-contained)
│
└── implementation-docs/          ← Implementation System
    ├── index.html                ← System overview and doc index
    ├── mobile-guide.html         ← Mobile app user guide (all roles, all modules)
    ├── web-guide.html            ← Web platform guide (all modules)
    └── quick-start.html          ← Role quick-start cards (PA, Champion, Officer/PM)
```

New systems get their own folder at the root level (e.g. `me-docs/`). Add a card to the root `index.html` when the folder is ready.

---

## Systems

| System | Folder | Status |
|--------|--------|--------|
| Intelligent Design System (IDS) | `ids-docs/` | Live |
| Implementation System | `implementation-docs/` | Live |
| Monitoring & Evaluation | `me-docs/` | Planned |

---

## Releases

Versioned snapshots of documentation are published as [GitHub Releases](../../releases). Each release tags a stable point in time and attaches the self-contained HTML files as downloadable assets — useful for sharing offline copies or archiving a specific program cycle.

| Tag | Description |
|-----|-------------|
| `ids-v1.0.0` | IDS User Guide + Presentation — initial published release |
| `imp-v1.0.0` | Implementation System — Mobile Guide, Web Guide, Quick-Start, Overview |

---

## Updating Docs

1. Edit the relevant HTML file(s) locally (source files live in `/Users/gokivumbi/Developer/Work/`).
2. Copy the updated file into the correct folder here.
3. Commit and push to `main` — the Pages site rebuilds automatically (~30 s).

```bash
# Example: update the mobile guide
cp scratchpad/imp-mobile-guide.html implementation-docs/mobile-guide.html
git add implementation-docs/mobile-guide.html
git commit -m "docs(imp): update mobile app guide"
git push
```

To publish a new versioned release, create a tag and attach assets:

```bash
gh release create imp-v1.1.0 \
  implementation-docs/mobile-guide.html \
  implementation-docs/web-guide.html \
  implementation-docs/quick-start.html \
  implementation-docs/index.html \
  --title "Implementation System v1.1.0" \
  --notes "Describe what changed in this version."
```

---

© 2026 Raising The Village

# Raising The Village — Documentation Hub

**Live site:** https://rtvinc.github.io/docs/

Central repository for technical documentation across all RTV program systems. Hosted via GitHub Pages from the `main` branch root.

---

## Structure

```
docs/
├── index.html              ← Hub landing page (https://rtvinc.github.io/docs/)
├── README.md               ← This file
│
└── ids-docs/               ← Intelligent Design System
    ├── index.html          ← IDS landing page
    ├── guide.html          ← Full user guide (HTML, self-contained)
    └── presentation.html  ← 12-slide onboarding deck (HTML, self-contained)
```

New systems get their own folder at the root level (e.g. `implementation-docs/`, `me-docs/`). Add a card to the root `index.html` when the folder is ready.

---

## Systems

| System | Folder | Status |
|--------|--------|--------|
| Intelligent Design System (IDS) | `ids-docs/` | ✅ Live |
| Implementation System | `implementation-docs/` | ⏳ Planned |
| Monitoring & Evaluation | `me-docs/` | ⏳ Planned |

---

## Releases

Versioned snapshots of documentation are published as [GitHub Releases](../../releases). Each release tags a stable point in time and attaches the self-contained HTML files as downloadable assets — useful for sharing offline copies or archiving a specific program cycle.

| Tag | Description |
|-----|-------------|
| `ids-v1.0.0` | IDS User Guide + Presentation — initial published release |

---

## Updating Docs

1. Edit the relevant HTML file(s) locally (source files live in `/Users/gokivumbi/Developer/Work/`).
2. Copy the updated file into the correct folder here.
3. Commit and push to `main` — the Pages site rebuilds automatically (~30 s).

```bash
# Example: update the IDS user guide
cp "IDS User Guide.html" ids-docs/guide.html
git add ids-docs/guide.html
git commit -m "docs(ids): update user guide"
git push
```

To publish a new versioned release, create a tag and attach assets:

```bash
gh release create ids-v1.1.0 \
  ids-docs/guide.html \
  ids-docs/presentation.html \
  --title "IDS v1.1.0" \
  --notes "Describe what changed in this version."
```

---

© 2026 Raising The Village

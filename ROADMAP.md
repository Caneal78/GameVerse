# GameVerse Roadmap

This document maps [GAMEVERSE_MANIFEST.md](GAMEVERSE_MANIFEST.md) pillars to current implementation status and records strategic decisions.

## Status Legend

| Status | Meaning |
|--------|---------|
| Done | Shipped in v1 |
| Partial | Core workflow exists; manifest vision not complete |
| Planned | Not started |
| Deferred | Intentionally postponed |

## Manifest Pillars

| Pillar | Status | Notes |
|--------|--------|-------|
| Asset Vault | Partial | Import (copy/move/link), versioning, thumbnails, collections, FTS search, export, backup |
| Advanced Notebook | Partial | Plain-text notes with types (incl. AI Prompt labels); no markdown/canvas yet |
| Sketch Board | Planned | Not started |
| Dialogue Editor | Planned | Not started |
| Character / Creature Bible | Partial | Item templates + World Bible pages |
| Prop Library | Done | Items + file sections cover props/weapons/materials |
| AI Workspace | Deferred | Note types only; no LLM integration |
| 3D Viewer | Partial | Three.js GLB/GLTF/FBX preview in Files tab |
| Animation Studio | Partial | FBX/GLB animation playback in Animations tab |
| Project Dashboard | Done | Dashboard, filters, search, item detail |
| AI Assistant | Deferred | Awaiting local-first or opt-in API design |
| Plugin System | Planned | Monolithic app today |
| Cloud Sync / Multi-user | Deferred | Local-first by design for v1 |

## Technology Stack (Actual vs Manifest)

| Manifest | Current |
|----------|---------|
| TypeScript | JavaScript (`.js` / `.jsx`) |
| Babylon.js | Three.js |
| Monaco Editor | Plain `<textarea>` |
| Canvas notebooks | Text notes |

## v1 Stabilization (Complete / In Progress)

- [x] Three.js `SRGBColorSpace` API update
- [x] Consistent IPC error handling with toasts
- [x] World Bible category loading fix
- [x] React error boundary
- [x] `npm test` backend script
- [x] Unified tag shape (`{ id, name }`) in list and get
- [x] `gvfile://` path scoping to vault + linked files
- [x] Production CSP tightening via Vite build
- [x] Vitest smoke tests

## Next Strategic Pillar (Decision)

**Chosen: Rich Notebook** (markdown editing + better authoring UX)

Rationale:
- Delivers immediate user value without external API dependencies
- Aligns with manifest "killer feature" positioning
- Fits local-first security model in [SECURITY.md](SECURITY.md)
- Lower risk than plugin architecture or AI integration for the next sprint

### Rich Notebook — Planned Scope

1. Markdown rendering preview in NotebookTab
2. Split edit/preview or toggle mode
3. Optional syntax highlighting for code blocks in notes
4. Autosave or unsaved-changes warning

### Deferred Alternatives

| Option | Why deferred |
|--------|----------------|
| AI Integration | Needs API key UX, cost controls, and privacy policy |
| Plugin Architecture | Better after IPC modules are split from `main.js` |

## Future Phases

### Phase 2 — Polish v1
- World Bible autosave / dirty-state warning
- Settings: rebuild search index
- Export progress indicator for large bundles
- Thumbnail generation for additional file types

### Phase 3 — Rich Notebook (next big bet)
- See scope above

### Phase 4 — Platform expansion
- Plugin extraction (notebook, dialogue, 3D viewer as modules)
- AI workspace (local LLM or opt-in cloud)
- Dialogue editor as first plugin

## Related Docs

- [todo.md](todo.md) — historical build checklist (mostly complete)
- [USER_GUIDE.md](USER_GUIDE.md) — end-user documentation
- [SECURITY.md](SECURITY.md) — security model

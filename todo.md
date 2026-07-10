# GameVerse Build Plan

> **Note:** Most v1 items below are implemented. See [ROADMAP.md](ROADMAP.md) for current status and next priorities.

## Foundation
- [x] Project scaffold (Electron + Vite/React)
- [x] Install dependencies (better-sqlite3, archiver, uuid, three, etc.)
- [x] Database schema (items, tags, links, files, versions, collections, notes, FTS5)
- [x] Electron main process (window, IPC bridge, project lifecycle)
- [x] Preload API surface

## Backend / IPC Logic
- [x] New Project (create vault folder structure + db)
- [x] Load Project (open existing vault, validate)
- [x] Item CRUD (create/read/update/delete + templates per category)
- [x] Tag system (assign/create/filter)
- [x] File import (copy into vault, categorize by section, record metadata)
- [x] Version management (keep old versions, restore)
- [x] Linking system (bidirectional item connections)
- [x] Collections (custom groups)
- [x] Full text search (FTS5 across names/tags/notes/files)
- [x] Export system (bundle item files + docs into Exports/)
- [x] Backup system (zip vault into Backups/)

## Frontend (React)
- [x] Startup screen (New Project / Load Project)
- [x] Dashboard (grid browser, search bar, filters, categories, tags)
- [x] Create Item modal (category + template fields)
- [x] Item Detail page (tabs: Info, Notebook, Images, Audio, Models, Animations, Scripts, Links, Versions)
- [x] 3D model preview (Three.js for GLB/GLTF/FBX)
- [x] Import UI (drag & drop + file dialog)
- [x] Collections UI
- [x] Export UI
- [x] Global search results view
- [x] Dark theme styling

## Packaging & Delivery
- [x] Verify build compiles (vite build + electron main syntax check)
- [x] README with run instructions
- [ ] Zip full source for delivery

## Quality & Hardening (v1.1)
- [x] Backend integration test (`npm test`)
- [x] Frontend Vitest smoke tests
- [x] IPC error handling + React error boundary
- [x] gvfile:// vault path scoping
- [x] Production CSP tightening

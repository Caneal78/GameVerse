# GameVerse

GameVerse is a desktop-first game development database for characters, locations, items, world bible entries, assets, links, backups, and export bundles.

## What It Includes
- Electron desktop app for Windows, macOS, and Linux
- Vite + React renderer
- SQLite-backed project vaults
- File import, versioning, search, collections, and exports

## Quick Start
1. Install dependencies with `npm install`
2. Start the combined dev workflow with `npm run dev`
3. Build the web bundle with `npm run build`
4. Package the desktop app with `npm run dist`

## Project Layout
- `src/` - React UI
- `electron/` - Main process, preload bridge, SQLite helpers, file vault logic
- `scripts/` - Dev runner
- `build/` - App icons and packaging assets
- `dist/` - Production renderer build output

## Desktop Packaging
The packaged app is configured through `electron-builder` in `package.json`. The current build targets are:
- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage

## Documentation
- `USER_GUIDE.md`
- `SECURITY.md`
- `COPYRIGHT.md`
- `LICENSE`

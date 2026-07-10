# Security Notes

GameVerse is designed to keep project data local to the user's machine.

## Security Model
- Renderer access is limited to a preload-exposed IPC API
- Node integration is disabled in the renderer
- Navigation away from the app is blocked by the main process
- Local vault files are served through a custom `gvfile://` protocol
- `gvfile://` requests are restricted to the open project vault and registered linked files
- Production builds use a stricter Content-Security-Policy (no `unsafe-eval`); development retains relaxed CSP for Vite HMR

## File Safety
- Imported files are stored inside the project vault when copy or move mode is used
- Linked files are treated as external references and remain outside the vault
- Stored paths are normalized before file deletion or resolution

## Operational Guidance
- Keep projects in trusted folders that you control
- Do not open vault files from untrusted sources without review
- Review linked file paths before distributing a project

## Reporting Issues
If you discover a security issue, document the steps to reproduce it and review the path handling or IPC call involved before shipping a release.

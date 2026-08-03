# GameVerse Beta Deployment Guide

This guide walks you through building and distributing GameVerse for beta testing.

---

## Quick Start: Building the App

### Prerequisites
- Node.js 18+ (`node --version`)
- npm or yarn
- Git (for version control)

### Step 1: Prepare the Repository

```bash
# Clone or navigate to the GameVerse repository
cd /path/to/gameverse

# Verify the main files exist
ls package.json vite.config.js electron/main.js src/main.jsx
```

### Step 2: Install Dependencies

```bash
npm install
```

**Note:** If `npm install` fails on better-sqlite3 during CI/CD, the native build will happen on the target machine automatically.

### Step 3: Run Tests (Optional but Recommended)

```bash
# Run backend integration tests
npm test

# Run frontend smoke tests
npm run test:frontend
```

### Step 4: Build for Production

```bash
# Build the Vite bundle (optimized React app)
npm run build

# Verify the build output
ls -la dist/
```

### Step 5: Package Desktop Installers

```bash
# Create platform-specific installers (Windows, macOS, Linux)
npm run dist
```

**Output files will be in `./dist/`:**
- **Windows:** `dist/GameVerse-1.0.0.exe` + `dist/GameVerse-1.0.0-portable.exe`
- **macOS:** `dist/GameVerse-1.0.0.dmg`
- **Linux:** `dist/GameVerse-1.0.0.AppImage`

---

## Distribution Methods

### Method 1: GitHub Releases (Recommended for Beta)

**Advantages:**
- Automatic download links
- Version history tracking
- Easy for testers to find latest build
- Integrates with GitHub workflows

**Steps:**

1. **Create a GitHub Release:**
   ```bash
   git tag v1.0.0-beta.1
   git push origin v1.0.0-beta.1
   ```

2. **Upload to GitHub Releases** (via web UI or CLI):
   - Go to: https://github.com/Caneal78/GameVerse/releases
   - Click "Draft a new release"
   - Select your tag (v1.0.0-beta.1)
   - Upload the three files:
     - `GameVerse-1.0.0.exe`
     - `GameVerse-1.0.0.dmg`
     - `GameVerse-1.0.0.AppImage`
   - Add release notes (copy from [DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md))
   - Publish

3. **Share with Beta Testers:**
   ```
   Windows: https://github.com/Caneal78/GameVerse/releases/download/v1.0.0-beta.1/GameVerse-1.0.0.exe
   macOS:   https://github.com/Caneal78/GameVerse/releases/download/v1.0.0-beta.1/GameVerse-1.0.0.dmg
   Linux:   https://github.com/Caneal78/GameVerse/releases/download/v1.0.0-beta.1/GameVerse-1.0.0.AppImage
   ```

### Method 2: Vercel Blob Storage

**Advantages:**
- CDN-backed fast downloads
- Integrates with Vercel projects
- Good for web-based distribution pages

**Steps:**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Upload files:
   ```bash
   vercel blob upload dist/GameVerse-1.0.0.exe --token=<YOUR_BLOB_TOKEN>
   vercel blob upload dist/GameVerse-1.0.0.dmg --token=<YOUR_BLOB_TOKEN>
   vercel blob upload dist/GameVerse-1.0.0.AppImage --token=<YOUR_BLOB_TOKEN>
   ```

3. Copy the returned CDN URLs for distribution

### Method 3: Self-Hosted Website

**Advantages:**
- Full control over presentation
- Can host custom download page
- Supports analytics

**Steps:**

1. Create a download page (HTML/Next.js)
2. Upload installers to your hosting (Vercel, Netlify, etc.)
3. Link installers in the download page
4. Share the URL with testers

---

## Installation Instructions for Beta Testers

Share these instructions with your beta testers:

### Windows

1. Download `GameVerse-1.0.0.exe` from the link provided
2. Double-click the installer
3. Follow the setup wizard
4. Choose install location
5. Click "Install"
6. Launch GameVerse from Start Menu or Desktop shortcut

**Portable version** (no installation required):
- Download `GameVerse-1.0.0-portable.exe`
- Double-click to run directly

### macOS

1. Download `GameVerse-1.0.0.dmg`
2. Double-click to mount the disk image
3. Drag "GameVerse" to the Applications folder
4. Open Applications → GameVerse
5. Approve the security prompt (first launch)

### Linux

1. Download `GameVerse-1.0.0.AppImage`
2. Make it executable:
   ```bash
   chmod +x GameVerse-1.0.0.AppImage
   ```
3. Double-click to run, or from terminal:
   ```bash
   ./GameVerse-1.0.0.AppImage
   ```

---

## Verifying the Build

Before distributing, verify each installer works:

### Windows
```bash
# Run the installer in a VM or test machine
./dist/GameVerse-1.0.0.exe

# Or test the portable version
./dist/GameVerse-1.0.0-portable.exe
```

### macOS
```bash
# Mount and open the DMG
open dist/GameVerse-1.0.0.dmg
```

### Linux
```bash
# Run the AppImage
./dist/GameVerse-1.0.0.AppImage
```

**Check:**
- App launches without errors
- Welcome screen appears
- Can create a new project
- Can close and reopen the app

---

## Communicating with Beta Testers

### 1. Beta Announcement Email Template

```
Subject: GameVerse Beta - Test the New Game Asset Manager

Hi [Tester Name],

We're excited to launch GameVerse into beta! GameVerse is a professional game asset 
management system that helps organize, preview, and prepare game assets.

📥 Download GameVerse:
- Windows: [LINK]
- macOS: [LINK]
- Linux: [LINK]

🚀 Quick Start:
1. Download and install for your platform
2. Open GameVerse
3. Click "New Project"
4. Drag & drop some game assets (models, images, audio, etc.)
5. Explore and organize!

💬 Report Issues:
- GitHub Issues: https://github.com/Caneal78/GameVerse/issues
- Email: [YOUR_EMAIL]
- Discord: [LINK]

📖 Documentation:
- User Guide: [Link to USER_GUIDE.md]
- Roadmap: [Link to ROADMAP.md]

Questions? Check the User Guide or email us!

Thanks for testing,
GameVerse Team
```

### 2. Feedback Form (Optional)

Create a simple form to collect feedback:
- What OS/version did you test on?
- What features did you try?
- Did you encounter any bugs?
- What would you like to see next?
- Overall rating (1-10)?

### 3. Known Issues Document

Create a `KNOWN_ISSUES_BETA.md`:
```markdown
# Known Issues - GameVerse v1.0.0-beta.1

## Fixed in this build
- [None yet - first beta]

## Known limitations
- AI integration not available yet (planned for Phase 2)
- No cloud sync (local-first by design)
- Notes are plain text (markdown coming in Phase 3)

## Workarounds
- To reset the search index: Delete .gameverse/db folder in your project
```

---

## Managing Updates

### Rolling Out a Patch

When you have a bug fix:

1. **Fix the code** and commit
2. **Update version** in package.json: `"version": "1.0.0-beta.2"`
3. **Build & package:**
   ```bash
   npm run build
   npm run dist
   ```
4. **Create a new release** on GitHub
5. **Announce update** to testers

### Auto-Update (Future Enhancement)

Eventually, you can add auto-updates:
```bash
npm install electron-updater
```

Then in `electron/main.js`:
```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

---

## Monitoring & Support

### Set Up Issue Tracking

1. Go to: https://github.com/Caneal78/GameVerse/issues
2. Enable issue templates
3. Create labels: `bug`, `feature-request`, `documentation`

### Monitor Feedback

- Check GitHub Issues daily
- Respond within 24 hours
- Log issues in a spreadsheet for prioritization

### Hotfix Process

If a critical bug is reported:
1. Reproduce locally
2. Fix and test
3. Build patch version (e.g., v1.0.0-beta.1.1)
4. Release within 24 hours
5. Notify testers

---

## Troubleshooting Build Issues

### Issue: "vite: command not found"
```bash
# Solution: Install dependencies properly
npm install --save-dev vite
npm run build
```

### Issue: "better-sqlite3 build fails"
```bash
# This may happen in CI/CD - it's expected
# The package will compile on the target machine
# For local development, ensure you have build tools:
# macOS: xcode-select --install
# Linux: sudo apt-get install build-essential python3
# Windows: Visual Studio Build Tools
```

### Issue: Installer is large (180+ MB)
- This is normal - includes Electron runtime and all dependencies
- Not much can be done without code splitting (future enhancement)

---

## Security Checklist

Before release:

- [ ] Review SECURITY.md with testers
- [ ] Confirm CSP is enabled in production build
- [ ] Verify no credentials in source code
- [ ] Check that data stays local (no cloud calls)
- [ ] Test gvfile:// protocol restrictions
- [ ] Review electron security docs

---

## Timeline Example

```
Week 1: Build & Distribute
- Monday: Build and upload installers
- Tuesday: Send to 5-10 initial testers
- Wednesday-Friday: Monitor for critical bugs

Week 2: First Patch
- Monday: Collect feedback, prioritize issues
- Tuesday-Wednesday: Fix critical bugs
- Thursday: Release patch (v1.0.0-beta.1.1)
- Friday: Expand to 20-30 more testers

Week 3-4: Iterate
- Collect more feedback
- Plan Phase 2 improvements
- Prepare for public beta (v1.0.0-beta.2)
```

---

## Next Steps After Beta

1. **Incorporate feedback** into Phase 2 roadmap
2. **Plan Rich Notebook** feature (markdown editing)
3. **Release v1.0.0-rc** (release candidate)
4. **Final polish** and bug fixes
5. **v1.0.0 general release**

---

## Support Resources

- **User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Security Info:** [SECURITY.md](SECURITY.md)
- **Roadmap:** [ROADMAP.md](ROADMAP.md)
- **Issues:** https://github.com/Caneal78/GameVerse/issues
- **Discussions:** https://github.com/Caneal78/GameVerse/discussions

---

**Ready to launch? Run `npm run dist` and start sharing!** 🚀

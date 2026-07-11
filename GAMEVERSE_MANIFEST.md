# GAMEVERSE_MANIFEST.md

# GameVerse Project Constitution

Version: 1.0  
Project Name: GameVerse  
Purpose: Universal Game Asset Management & Preparation Workspace

---

# 1. PROJECT IDENTITY

GameVerse is a professional-grade game asset management and preparation platform designed to solve one of the largest recurring problems in game development:

## Asset Chaos

Game developers constantly struggle with:

- Finding assets
- Organizing assets
- Understanding asset relationships
- Tracking versions
- Previewing unknown files
- Preparing assets for different engines
- Auditing technical requirements
- Managing large libraries

GameVerse exists as the intelligence layer between asset creation tools and game engines.

GameVerse is:

- An advanced asset browser
- An asset intelligence system
- A relationship management system
- A preview environment
- A production preparation workspace
- A workflow organization platform

GameVerse is NOT:

- A replacement for Blender
- A replacement for Unity
- A replacement for Unreal
- A replacement for Godot
- A replacement for a full game engine

GameVerse enhances existing workflows.

---

# 2. CORE MISSION

The primary mission of GameVerse:

> Make game assets easy to find, understand, organize, prepare, and use.

Every feature must support this mission.

The Asset Library is the center of the ecosystem.

All future systems must connect back to asset management.

---

# 3. PRIMARY PRODUCT PILLARS

# Pillar 1: Asset Vault

The foundation of GameVerse.

A universal asset library supporting:

- 3D models
- textures
- materials
- animations
- audio
- images
- sprites
- scripts
- prefabs
- scenes
- documents

The Asset Vault provides:

- importing
- indexing
- metadata extraction
- tagging
- searching
- filtering
- categorization
- version tracking
- relationship tracking
- previews

---

# Pillar 2: Asset Intelligence Engine

Every asset should understand itself.

GameVerse analyzes assets automatically.

## Models

Detect:

- file format
- polygon count
- vertex count
- mesh count
- materials
- textures
- skeletons
- bones
- animations
- dimensions
- scale
- orientation
- naming problems
- optimization issues

## Textures

Detect:

- resolution
- file format
- compression
- memory footprint
- channels
- transparency
- material relationships

## Animations

Detect:

- animation names
- duration
- frame rate
- skeleton compatibility
- root motion
- looping information

---

# Pillar 3: Asset Relationships

Assets are not isolated files.

GameVerse treats assets as connected ecosystems.

Example:

```
Knight Character

|
├── Knight_Model.fbx
├── Knight_Texture.png
├── Knight_Normal.png
├── Knight_Material.mat
├── Knight_Skeleton
├── Idle.anim
├── Run.anim
├── Attack.anim
└── Sword.prefab
```

Relationships are more important than filenames.

GameVerse must understand:

- dependencies
- shared materials
- animation connections
- texture usage
- prefab relationships
- scene usage

---

# Pillar 4: Interactive Asset Preview

Developers must inspect assets without opening external applications.

## 3D Preview

Support:

- GLB
- GLTF
- FBX
- future formats

Features:

- orbit controls
- zoom
- camera fitting
- lighting
- shadows
- animation playback
- skeleton inspection
- material inspection
- mesh inspection
- transform inspection

## 2D Preview

Support:

- images
- textures
- sprites
- sprite sheets
- UI assets

## Audio Preview

Support:

- waveform display
- playback
- metadata

---

# 4. TECHNOLOGY FOUNDATION

## Desktop Platform

Electron

Purpose:

- standalone desktop application
- filesystem access
- native integration

---

## Frontend

React

Purpose:

- modular interface
- workspace panels
- editors
- asset views

---

## Primary Renderer

Three.js

Purpose:

- fast asset previews
- WebGL rendering
- model inspection
- animation playback

Three.js remains the primary asset browser renderer.

---

## Future Advanced Renderer

Babylon.js may be integrated as an optional advanced editing module.

Possible uses:

- advanced material editing
- node-based materials
- scene editing
- advanced 3D tools

Babylon.js does not replace the core Three.js viewer.

---

## Database

Current:

lowdb

Future:

scalable database system when required.

Stores:

- assets
- metadata
- relationships
- tags
- projects
- engine profiles

---

# 5. ASSET MANAGEMENT FIRST PRINCIPLE

The Asset Vault is the heart of GameVerse.

Everything connects back to assets.

Examples:

Character systems use:

- models
- skeletons
- animations
- materials
- textures

Scene systems use:

- models
- lighting
- materials
- environments

Controller systems use:

- characters
- animations
- behaviors

Nothing should exist separately from the asset ecosystem.

---

# 6. ENGINE PROFILE SYSTEM

GameVerse supports multiple game engines.

Each engine has a preparation profile.

## Unity Profile

Handles:

- scale standards
- naming conventions
- texture rules
- import settings
- export settings

## Unreal Profile

Handles:

- centimeter scale
- material standards
- naming conventions
- optimization rules

## Godot Profile

Handles:

- GLB workflow
- naming conventions
- import preparation

Goal:

Prepare once.

Export anywhere.

---

# 7. QUALITY CONTROL SYSTEM

GameVerse acts as an asset inspection station.

## Asset Audit Example

```
Dragon.fbx

Geometry:
185,430 triangles

Materials:
12

Textures:
8

Warnings:

⚠ Scale incorrect
⚠ Texture size excessive
⚠ Missing normal map
⚠ High polygon count

Recommendations:

Optimize mesh
Reduce textures
Create LOD
```

---

# Scene Audit Example

```
Forest_Level

Objects:
2845

Warnings:

⚠ Duplicate materials
⚠ Oversized textures
⚠ Excessive triangles
⚠ Missing collisions
⚠ Unused assets
```

---

# 8. INTERACTIVE GAME PREPARATION WORKSPACE

Future systems built on the Asset Vault.

## Character Workspace

Purpose:

Prepare characters for engines.

Features:

- assign model
- assign skeleton
- assign animations
- configure controller
- create state machine
- export setup

---

# State Machine Editor

Visual behavior system.

Example:

```
Idle
 |
Walk
 |
Run
 |
Attack
 |
Death
```

Supports:

- animation states
- transitions
- conditions
- parameters

---

# Character Controller Builder

Create reusable controller definitions.

Examples:

- humanoid controller
- creature controller
- flying controller
- NPC controller
- vehicle controller

---

# 9. LIGHTWEIGHT EDITING PHILOSOPHY

GameVerse is a preparation tool.

It does not replace professional creation software.

Supported editing:

- position
- rotation
- scale correction
- axis correction
- material assignment
- texture replacement
- UV inspection
- basic texture adjustments

Complex modeling remains in:

- Blender
- Maya
- other DCC tools

---

# 10. AI DEVELOPMENT RULES

All AI coding assistants working on GameVerse must:

1. Preserve existing functionality.
2. Avoid unnecessary rewrites.
3. Maintain modular architecture.
4. Build scalable systems.
5. Document major changes.
6. Protect the Asset Vault foundation.
7. Favor MVP → Version 1 → Version 2 development.
8. Create systems that can scale to large asset libraries.

---

# 11. CURRENT ARCHITECTURE

Current:

```
Filesystem
    |
Asset Database
    |
Electron Bridge
    |
React Interface
    |
FilesTab
    |
Three.js Viewer
    |
WebGL Renderer
```

Future:

```
                 GameVerse

                     |
          Asset Intelligence Core

        ----------------------------
        |             |            |
     Browser       Auditor      Exporter

                     |
        --------------------------------
        |              |               |
     Three.js      Editors       Engine Profiles
     Viewer
```

---

# 12. DEVELOPMENT ROADMAP

## Phase 1: Asset Foundation

Priority:

★★★★★

Build:

- asset importing
- tagging system
- search
- filtering
- metadata extraction
- relationships
- previews

---

## Phase 2: Renderer Improvements

Build:

- memory cleanup
- modular viewers
- animation inspection
- skeleton inspection
- material inspection

---

## Phase 3: Asset Intelligence

Build:

- automatic audits
- optimization reports
- compatibility checks
- engine profiles

---

## Phase 4: Preparation Workspace

Build:

- character workspace
- state machines
- controllers
- scene analysis

---

## Phase 5: Advanced Editing

Build:

- UV tools
- texture tools
- material tools
- lightweight asset modification

---

# FINAL STATEMENT

GameVerse exists to eliminate asset chaos.

The problem GameVerse solves:

Developers create thousands of assets but lack a powerful system to understand, organize, prepare, and reuse them.

GameVerse becomes the bridge between creativity and implementation.

The asset is the center.

Organization creates efficiency.

Relationships create intelligence.

Preparation creates speed.

Everything in GameVerse exists to make game development faster, cleaner, and more scalable.
```
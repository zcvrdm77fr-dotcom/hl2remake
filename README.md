# HELIX PROTOCOL — Chapter 01: Sector 09

An original browser FPS fan chapter inspired by the chunky geometry, low-resolution textures and industrial atmosphere of late-1990s shooters, with Source-inspired movement. This is a real Three.js/WebGL 3D scene.

## What this build contains

- Real-time 3D rendering through Three.js WebGLRenderer (not a 2.5D raycaster).
- A low-poly research facility with gritty 64×64 nearest-filtered textures, flat lightmapped-style materials, hard shadows, distance fog, steel pipes, wall vents, warning signs, drums and shipping crates.
- A deliberately restrained late-90s presentation: no glossy PBR materials, filmic colour grade, blur-heavy glass panels or modern dashboard-style HUD.
- A complete first chapter objective chain: find a security card, open the bulkhead, retrieve the coolant coil, restore lift power and escape.
- One original hostile creature with pursuit and melee damage.
- A first-person crowbar and hit detection.
- Written radio/subtitle dialogue and original procedural radio/impact tones.
- Source-inspired ground acceleration, friction, air acceleration, gravity, jump arc and hold-to-bunnyhop behaviour.

## Run locally

The project is static and has no build step. Three.js r187 and PointerLockControls are bundled locally in `vendor/three/`, so the game does not need a runtime CDN connection.

From the repository root:

    python3 -m http.server 8000

Open http://localhost:8000 in a modern browser with WebGL support. Do not open index.html directly with file://.

## Controls

| Action | Control |
|---|---|
| Move | W / A / S / D |
| Look | Mouse |
| Jump | Space |
| Bunnyhop | Hold Space while moving; air-strafe with A/D and mouse |
| Sprint | Shift |
| Interact | E |
| Crowbar | Left mouse button or F |
| Pause / resume | Esc |

Click the baked-in START GAME label on the Xen title image to capture the mouse. Press Esc to release it and pause.

## Movement notes

The controller is Source-inspired, not a copy of Valve's engine. It uses separate ground and air acceleration, ground friction, gravity, a held-jump bunnyhop, sub-stepped horizontal collision and a speed cap. On the ground, WASD controls movement. In the air, only A/D applies directional acceleration; W/S do not steer you. Turn the mouse smoothly while holding A or D to curve the air-strafe and build momentum.

## Visual direction

The target is a deliberately old-school GoldSrc-era look: low-poly brush-like architecture, low-resolution pixel textures, matte Lambert lighting, restrained green-grey industrial colours, sharp shadows and atmospheric distance fog. The title screen uses the supplied purple Xen image; the button label is part of that image and its click target is transparent.

## Story premise

Your shift at Kallio Research Annex begins as routine maintenance. A recorded message from Dr. Lehto carries a timestamp from the future. The Helix experiment has already breached containment, and the only working route out is the service lift in Sector 09.

This is an original fan-made scenario. Half-Life and Valve are trademarks of their respective owners; this project is not affiliated with or endorsed by Valve.

## Bundled dependencies

Three.js r187 is vendored in `vendor/three/` under its MIT license. No npm install or bundler is required.

## GitHub Pages

The `feature/my-change` branch deploys automatically to GitHub Pages whenever a commit is pushed. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions** if it is not already selected. The workflow publishes the static project from the repository root; no npm build is needed.

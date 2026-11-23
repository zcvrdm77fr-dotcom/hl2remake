# Half-Life 2: Aikakatkos

An unofficial browser-based Half-Life 2 fan campaign rebuilt as a real-time **3D WebGL first-person game** with Three.js. This version replaces the old 2.5D raycaster gameplay path with a 3D scene, perspective camera, world-space collision, first-person pointer lock, and air/ground movement physics.

> This is an independent fan project, not a full recreation of Valve's Source engine or the original Half-Life 2 campaign. Half-Life and its associated marks belong to their respective rights holders.

## Run locally

This project uses ES modules and a pinned Three.js CDN import map. It does not need a bundler or npm install, but it must be served over HTTP.

\`\`\`bash
python3 -m http.server 8000
\`\`\`

Open <http://localhost:8000>. The first load requires an internet connection to retrieve Three.js 0.187.0 from jsDelivr.

## Controls

| Action | Control |
|---|---|
| Move | W A S D |
| Look | Mouse (click to lock pointer) |
| Sprint | Shift |
| Jump / auto-bunnyhop | Hold Space |
| Air-strafe | A / D while moving the mouse |
| Interact / pick up cells / use relay | E or right mouse button |
| Fire pulse tool | Left mouse button or F |
| Reload | R |
| Pause | Esc |
| Touch move/look | On-screen controls |

Bunnyhop is automatic while Space is held. Preserve speed across landings, build momentum with air strafing, and use small smooth mouse turns rather than jerking the mouse.

## What's in this rebuild

- Three.js WebGLRenderer with perspective 3D geometry, real depth testing, shadows, fog, tone mapping and material textures.
- A procedural City 17 street, station facade, rail yard, freight train, power relay, doors, lamps and industrial skyline.
- FPS camera with pointer lock and a visible first-person tool.
- Source-inspired horizontal acceleration, ground friction, air acceleration, gravity, jump arc, air control and momentum-preserving auto-bhop.
- Collisions against level geometry, with sliding along obstacles.
- Interactable energy cells and an opening bulkhead.
- Three waves of Combine units with basic pursuit and attack behaviour.
- A pulse weapon with hit detection, reloads and tracer effects.
- Finnish subtitles and optional native Finnish speech synthesis if the browser has a Finnish voice installed. The old mismatched radio recording is not used.
- Touch-friendly movement, jump, fire, use and look controls.

## Project layout

- \`index.html\` – menus, HUD and Three.js import map.
- \`style.css\` – interface, subtitles, menus and touch layout.
- \`src/main.js\` – game lifecycle, renderer, input, objectives, combat and HUD.
- \`src/world.js\` – City 17 environment, procedural materials, level colliders and interactables.
- \`src/physics.js\` – player movement and collision.
- \`src/entities.js\` – Combine character models, first-person tool and weapon effects.
- \`assets/\` – original fan-project art kept for the menu and icon.

The old root-level JavaScript files are retained as legacy reference files but are no longer loaded by the new game entry point.

## Technical notes

- Three.js is pinned to 0.187.0. Core and addons are loaded from the same jsDelivr version through an import map.
- Browser support requires WebGL 2 and ES modules.
- Pointer lock requires a user gesture (press **Start** first).
- The Finnish voice is provided by the browser/operating system. If no Finnish voice is installed, dialogue remains as subtitles.
- Visual quality and shadow-map performance depend on the user's GPU. The quality selector can be used to lower render scale on slower hardware.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Keep changes focused and document the relevant controls or systems.
4. Test locally with \`python3 -m http.server 8000\`.
5. Check browser devtools for module, WebGL or asset-loading errors before opening a pull request.


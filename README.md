# HELIX PROTOCOL — Kallio Research Annex

An original browser FPS fan campaign inspired by late-1990s PC shooters, with GoldSrc-style low-resolution geometry and Source-inspired movement. The project is a real Three.js/WebGL first-person game.

## Campaign

**Chapter 01 — Sector 09:** a routine maintenance shift turns into a containment breach. Find a security card, open the bulkhead, recover the coolant coil, restore backup power and call the maintenance lift.

**Chapter 02 — Freight Level:** ride the lift into the abandoned lower station. Search the cargo hall for a replacement fuse and a 9 mm service pistol, restart the coolant pumps, close the pressure valve and escape on the old service tram. The freight hall also contains an optional maintenance recording. The pump gallery has live steam vents, so keep moving.

The campaign now contains four additional connected environments: the lift transfer shaft, freight receiving hall, pump gallery and service-tram platform. The lower chapter adds two more hostile creature types/encounters, optional supplies, movable drums and a second escape sequence.

## Visual direction

- Real-time Three.js WebGL rendering; not a 2.5D raycaster.
- Low-poly industrial brushwork, 64×64 nearest-filtered textures, matte Lambert materials, hard shadows and distance fog.
- A freight gantry, cargo stacks, coolant spill, pressure tanks, large pipes, steam vents, valve wheel and a detailed low-poly service tram.
- Minimal in-game HUD text over the world. No floating dashboard cards or glassmorphism.

## Movement and combat

- Separate ground friction, ground acceleration and air acceleration.
- Buffered jumps, coyote-time tolerance, variable jump height and held-jump bunnyhopping.
- A/D air-strafing; turn the mouse while holding a strafe key to curve the jump.
- Crowbar melee on **F** or left mouse button.
- Find the 9 mm pistol in the freight hall. Switch between crowbar and pistol with **1** and **2**. Pistol ammunition is limited; collect spare magazines in the hall.
- Barrels can be pushed and knocked around. Steam vents damage the player while active.

## Controls

| Action | Control |
|---|---|
| Move | W / A / S / D |
| Look | Mouse |
| Jump / bunnyhop | Space |
| Sprint | Shift |
| Interact | E |
| Crowbar / fire pistol | F or left mouse |
| Interact with secondary mouse button | Right mouse |
| Select crowbar | 1 |
| Select pistol | 2 |
| Pause / resume | Esc |

## Run locally

The project is static and has no build step. Three.js r187 and PointerLockControls are bundled locally in `vendor/three/`, so the game does not need a runtime CDN connection.

From the repository root:

    python3 -m http.server 8000

Open http://localhost:8000 in a modern browser with WebGL support. Do not open index.html directly with file://.

## Story premise

Your shift at Kallio Research Annex begins as routine maintenance. A recorded message from Dr. Lehto carries a timestamp from the future. The Helix experiment has breached containment, and the only working route out appears to be the service lift. The lower freight station reveals that the incident was planned long before the alarm sounded.

This is an original fan-made scenario. Half-Life and Valve are trademarks of their respective owners; this project is not affiliated with or endorsed by Valve.

## Bundled dependencies

Three.js r187 is vendored in `vendor/three/` under its MIT license. No npm install or bundler is required.

## GitHub Pages

The `feature/my-change` branch deploys automatically to GitHub Pages whenever a commit is pushed. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions** if it is not already selected. The workflow publishes the static project from the repository root; no npm build is needed.

# Half-Life 2: Aikakatkos

**Aikakatkos** is an unofficial, browser-based Half-Life 2 fan campaign set in City 17. It is a small standalone experience built with HTML, CSS and vanilla JavaScript: explore the station, help the Resistance at the rail yard, and face the G-Man in a custom encounter.

> This is a fan project, not an official Half-Life game or a full remake of Half-Life 2. It is not affiliated with, endorsed by, or sponsored by Valve.

## Contents

- [Features](#features)
- [Play online](#play-online)
- [Run locally](#run-locally)
- [Controls](#controls)
- [Campaign and game modes](#campaign-and-game-modes)
- [Saving and browser data](#saving-and-browser-data)
- [Project structure](#project-structure)
- [Development notes](#development-notes)
- [Contributing](#contributing)

## Features

- A first-person, canvas-rendered City 17 environment.
- An original fan-campaign story with radio dialogue and characters.
- A station section built around finding and delivering two energy cells.
- A Resistance rail-yard encounter with Combine soldiers and Manhacks.
- A three-stage G-Man encounter, plus a practice mode.
- Synthesized ambience and sound effects, plus optional Finnish system speech when the browser has a Finnish voice installed.
- Source/Quake-inspired acceleration, ground friction, air control, momentum-preserving jumps and bunnyhopping.
- A retro low-resolution renderer with four distinct wall materials, a more detailed City 17 skyline and subtle CRT-style grading.
- A responsive interface with keyboard, mouse and touch controls.
- A minimap that can be toggled during play.
- A mission-progress indicator for the current section.
- A transmission journal that keeps a local history of up to 40 radio messages.

## Play online

Open the project's GitHub Pages site:

**https://eliasaarynen-creator.github.io/hl2remake/**

The published site may take a short time to update after a change is pushed. If the link is unavailable, use the local setup below or check the repository's **Actions** tab for the Pages deployment status.

## Run locally

There is no build step, package manager or dependency installation required. The game loads its scripts and media directly from the project folder, so run it through a local HTTP server rather than opening `index.html` as a file.

### Python

From the repository root:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

Stop the server with `Ctrl+C`.

### Node.js (optional)

If Node.js is installed, you can use any static file server. For example:

```bash
npx serve .
```

Open the local URL printed by the command.

## Controls

| Action | Keyboard / mouse |
|---|---|
| Move | `W` `A` `S` `D` |
| Look around | Mouse |
| Sprint | `Shift` |
| Interact / use the gravity gun | `E` or left mouse button |
| Fire the pulse rifle in the rail yard | Left mouse button or `F` |
| Reload the pulse rifle | `R` |
| Jump / bunnyhop (hold to auto-bhop) | `Space` |
| Dash / evade | `V` |
| Toggle the minimap | `M` |
| Pause / resume | `Esc` |
| Navigate the main menu | `↑` / `↓`, then `Enter` |

**Mouse tip:** click the game view to capture the mouse and look around. Press `Esc` to pause and release it.

### Touch screens

On touch devices, use the on-screen pad to move, swipe over the game view to look around, and use the jump, dash and action buttons. Hold jump to bunnyhop. In the air, use A/D and turn the mouse to build speed. The layout adapts to smaller screens.

The Settings menu can use the device's Finnish speech voice when one is installed. Otherwise the dialogue remains subtitled; the old mismatched radio recording is no longer played.

## Campaign and game modes

- **Campaign:** start a new story or continue the last saved checkpoint. Follow the station announcement, collect the energy cells, reach the rail yard and continue to the terminal.
- **Rail-yard practice:** jump straight into the Resistance rail-yard section.
- **G-Man practice:** train against the three-stage encounter without having to replay the full campaign.

The menu also contains the control guide, sound and sensitivity settings, and a link for players who own the original Half-Life 2.

## Saving and browser data

The game stores preferences, checkpoints and the radio transcript in the browser's `localStorage`. Data is local to the browser profile and origin; it is not an account-based or cloud save.

| Storage key | Contents |
|---|---|
| `lambda.progress` | Campaign checkpoint and current progress |
| `lambda.settings` | Sound, volume, mouse sensitivity and minimap preference |
| `lambda.radioLog` | Up to 40 recently heard radio messages |

Clearing the browser's site data or using a different browser/profile removes or separates these local saves. The game periodically saves progress while running and also saves when pausing or leaving the page.

## Project structure

```text
.
├── index.html          # Page structure, menus and game HUD
├── style.css           # Layout, visual theme and responsive styles
├── app.js              # Menus, settings, input, audio and save handling
├── game.js             # Main game loop, world rendering and player logic
├── story.js            # Story dialogue and radio playback
├── radio-clips.js      # Time ranges for dialogue clips in radio.mp3
├── encounter.js        # G-Man encounter logic
├── yard.js             # Rail-yard map, enemies and encounter logic
├── art.js              # Main game artwork and generated sprites
├── yard-art.js         # Rail-yard artwork
└── assets/
    ├── city17.webp
    ├── gman.svg
    ├── kajo.webp
    ├── lambda.svg
    ├── masonry.webp
    ├── radio.mp3
    ├── saro.webp
    └── soul.webp
```

The JavaScript files are loaded directly by `index.html` in dependency order. Keep the script tags in that file in sync when adding or renaming modules.

## Development notes

- The project is intentionally dependency-light: plain HTML, CSS and JavaScript, with no bundler.
- Keep asset paths relative to the repository root so the site works both locally and on GitHub Pages.
- Use `textContent` for dialogue and other player-provided or dynamic text. Escape text before inserting it into HTML templates.
- Check JavaScript syntax after editing:

  ```bash
  for file in app.js game.js story.js encounter.js yard.js art.js yard-art.js radio-clips.js; do
    node --check "$file" || exit 1
  done
  ```

- Test both desktop controls and the touch layout after changing input or HUD code.
- Test a fresh campaign as well as loading an existing checkpoint when changing save or story logic.

## Contributing

1. Fork the repository.
2. Create a focused branch for your change.
3. Keep commits small and describe what changed.
4. Run the syntax checks above and test the relevant game section in a browser.
5. Open a pull request with a short summary and testing notes.

Please avoid committing personal browser data, local build output or unrelated files.

---

*Half-Life 2 and its associated names and marks belong to their respective rights holders. This project is an independent fan-made tribute.*

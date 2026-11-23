# Half-Life 2: Aikakatkos

An unofficial browser-based fan campaign built with static HTML, CSS and JavaScript. No build step or package installation is required.

## Run locally

Serve the project directory over HTTP (the radio audio is loaded as a local asset):

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Controls

- Move: `W A S D`; sprint: `Shift`
- Look around: mouse (click the game to lock the pointer)
- Interact / gravity gun: `E` or left mouse button
- Pulse rifle: left mouse button or `F`; reload: `R`
- Dash / evade: `Space`
- Toggle minimap: `M`
- Open the transmission journal: **LOKI** in the HUD
- Pause: `Esc`

Touch devices use the on-screen movement pad and action buttons.

## Improvements in feature/my-change

- Persistent mission progress for the station, rail-yard and G-Man encounter.
- A transmission journal that stores up to 40 radio messages in browser local storage.
- Minimap toggle via `M` and a matching settings checkbox.
- Clearer HUD actions and responsive journal controls.

Settings, radio history and checkpoints are stored in the current browser profile.

This is a fan-made project and is not affiliated with or endorsed by Valve.

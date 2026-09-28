# The Third Light — desktop beta

This is the full six-chapter island investigation, released as a desktop beta for Chrome or Edge. It includes the story ending, fires, three short cutscenes, weather, ferry arrival, vehicles, case work, and chapter selection. Bugs and rough edges may remain. The public beta is live at [gamedev-7ac48.web.app](https://gamedev-7ac48.web.app/), with these archives available for local play and source review.

Rainy Chapters 2–3 now have brief recurring squalls. The sustained storms in Chapters 4–5 have clustered lightning at varied offshore positions, with stronger tree and grass sway, windblown coastal mist, and gusting wind audio. Thunder follows the strike across the stereo field, while the rain recording is softer. Sheltered interiors clear the outdoor mist.

## Play online

Open [https://gamedev-7ac48.web.app/](https://gamedev-7ac48.web.app/) in a desktop Chrome or Edge browser. The live Firebase Hosting page was checked through its main menu and Chapter 1 ferry/cliff scene without browser warnings or errors. Your investigation saves in this browser's local storage for that site; it does not sync with local or preview copies.

## Play on this computer

For a local copy, open PowerShell in the `TheThirdLight` folder from the source archive, then run:

```powershell
npm install
npm run beta
```

This command serves the included production `dist/` build. Node.js 20.19+ or 22.12+ is required. Use the local address printed by Vite.

## Share the smaller game archive

Extract `TheThirdLight-beta.zip` and open PowerShell in the extracted folder. If Python 3 is installed, run:

```powershell
py -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173/> in Chrome or Edge and keep the terminal open while playing. The static archive contains the compiled site, this guide, and asset credits. Opening `dist/index.html` directly as a file will not work reliably; use a local web server. The localhost address works only on the computer running the server. A friend on another network can use the live link above or download the archive and run it locally.

## First play and feedback

Choose **Arrive on the Island** for a new main save, or **Select Chapters** to try a later chapter with earlier evidence supplied. A loading screen shows real asset counts while models and textures load, then stays until the first chapter view is ready; controls unlock when it clears. WASD moves, the mouse looks around, E interacts, M opens the map, B opens the case board, and Esc opens the menu. Each browser profile and origin keeps its own local save. The piano and sea volume controls are on the menu.

Press **G** during normal play to enter or leave Drone View. Fly with WASD and mouse look, use **Space** to rise, **Ctrl** to descend, and **Shift** to boost. It is a separate sightseeing camera: Mara stays in place, and flight does not collect evidence or overwrite her saved position. On landscape touch, use the **Drone** top button, left stick and right-side drag, and hold **Up**, **Down**, or **Boost**; the action button exits. Drone View is unavailable while aboard the ferry, driving, aiming the survey camera, falling, or watching a story scene. The North Inlet rescue craft now uses the original textured launch visual instead of the older small Blender boat model.

If you report a bug, include the chapter, objective text, approximate map position, browser, and what happened. The optional `?perf=1` URL parameter shows foreground frame-rate and draw-call telemetry after a short warmup; it does not measure GPU time.

## Beta test status

- The same saved main-campaign browser run completed the Chapter 5 rescue, Chapter 6 mainland line and correction, North Inlet Jetty family handoff, and reopened inquiry. The six-question hearing ended with the old sole-error finding withdrawn and the corrected sources on record. Separate chapter-slot browser checks also passed. This verifies a saved browser route through the ending; a fresh-player pacing run is still pending.
- Desktop frame rate on representative hardware, final pacing, and art polish remain unmeasured. The browser automation used for QA is too variable for a reliable GPU performance result.
- Landscape touch controls exist, but a complete run on real Android and iOS devices has not been verified. This package is labeled desktop beta.
- A Chapter 6 interaction overlap at the Radio House routing controls was fixed and retested with the same saved campaign. The checked-packet response still says the rescue launch is preparing even if its Chapter 5 rescue has already finished; that line is a known dialogue inconsistency in this beta.
- A source-browser Chapter 3 check saw the opening loading screen, chapter menu, chapter-entry loading screen, and playable rainy view in order, with no browser warnings or errors. The loading phase uses actual Three.js resource counts and pauses input until the chapter frame is ready; it does not use a timed percentage.
- A production-browser pass covered loading through Chapter 1 and Chapter 6 starts and reloads, desktop Drone View flight and return, landscape touch drone controls at 960×540, and the finished North Inlet rescue launch from the jetty. No game-origin console errors appeared. Real-device mobile performance remains unverified.
- The storm update passed the full 321-test suite and a Chapter 5 outdoor browser smoke check with no game-origin console errors. The automated check does not measure GPU frame time or replace a longer weather-pacing playtest.

See `CREDITS.md` and `dist/THIRD_PARTY_LICENSES.md` for asset and library attribution. No proprietary Grassworks asset or film score is included.

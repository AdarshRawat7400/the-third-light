# The Third Light

A full six-chapter first-person island mystery in desktop beta. Explore Greywake Island, compare two navigation-light sightlines, follow the evidence about a seventeen-year-old wreck, rescue a missing technician, and reach the reopened inquiry. The island is procedurally shaped at roughly 0.45 km². The campaign has a beginning and an ending; its 2–4 hour playtime target has not been measured, and bugs or rough edges may remain.

**Play online:** [The Third Light](https://gamedev-7ac48.web.app/). Firebase Hosting serves the production `dist/` build; saves stay in each browser profile and site origin. The source and static ZIPs can also be run locally as described below.

The current visual pass includes procedural 3D-density clouds and lightning storms, a moving sea with broken shoreline surf, wind-swept grass and coastal tree clusters, weather-driven rain streaks and contact splashes, and rain-streaked windows. The high coastal cliffs use credited CC0 vertical rock-face maps. The default MIT-licensed WindSweptGrass meadow authors about 3.84 million blades across the island, roughly 10× the prior count. Terrain masks clear trails, prison paving, buildings, and exposed cliff edges; distance culling and adaptive detail limit the blades drawn each frame. The near field draws the same 160,345 authored blades without an unused 10.26 MB identity-transform buffer; meadow and far cards omit another 6.10 MB of redundant identity matrices without changing their blades. The storm still animates 16,000 seeded rain lines, now with shared line endpoints that cut its geometry attribute data by 56.25%. The 240 coastal trees use shared, instanced EZ-Tree shapes with near and far detail. Far tree instances outside the camera view are omitted; nearby trees remain to cast their existing shadows, and turning the camera refreshes the far batches. Their geometry-only tree module omits unused demo textures and produces byte-for-byte identical geometry for all 24 near/far prototypes. Their leaf artwork is original, and bark maps are credited CC0. The Blender buildings have 51 framed panes across the lodge, archive, radio house, and pump house, with weather effects on those and the tower-base windows. Rain continues outdoors when the player enters a building, while roofs block falling streaks and ground splashes beneath them.

When a camera update selects the same tree roots, their instance matrices and colors remain on the GPU without another upload or bounding-sphere rebuild. This keeps the authored trees and shadows intact; its effect on actual frame rate still needs hardware measurement. A lossless spatial index narrows static circle collision checks across 659 obstacles. In a synthetic collision probe, the same 191 hits took 212–218 ms with a linear scan and 4.9–5.8 ms with the index; this is CPU probe time, not gameplay frame rate.

The twelve prison guards and detainees keep their collision and conversation positions current off camera. Their 408 animated mesh parts update when the prison enters the main camera or sun shadow view, then catch up to the exact current pose. A synthetic 1,200-frame distant-prison CPU run fell from 62–68 ms to 1–3 ms; actual gameplay frame-rate gain remains unmeasured.

Two small tended fires now light the existing lodge stove and a brazier under the prison gate canopy. Their flames, and the brazier's short smoke plume, raymarch a generated 3D density texture inside bounded volumes. The volumes, glow, and static fixtures cull at different distances; mobile graphics profiles use fewer samples. They add no downloadable media or external asset license.

The six-chapter investigation includes physical props for clues, a navigable former maritime detention compound, two small service buildings, three drivable period vehicles, and four island residents with evidence-aware conversations. Tamsin, Oren, Elias, and Iris use distinct CC0 MakeHuman-derived characters when approached, with their procedural figures available while assets load or if loading fails. Iris retains her sealed document case through the rescue and daybreak handoff. Wet gravel service roads connect the vehicles to the main sites. Cars steer and brake, slow on rough ground, and stop at obstacles or steep grades. Witness statements are saved in the journal separately from physical records. After examining her working carbon in Chapter 1, players focus on three concrete details from Mara’s signing memory, then acknowledge the decision she actually made and what that memory cannot prove. In Chapter 2 they separately reconstruct the signing-room record and compare the archive case. Players also aim a field survey camera, compare tower wiring and both sightlines against a chart, link evidence on a case board, trace the intercepted radio route, optionally follow Iris’s documented route, test Elias’s account against records at a radio-house worktable, restore power, guide a rescue launch, work the service hatch, and compose a corrected daybreak report. After submitting the report, players return to North Inlet Jetty, speak with the captain’s daughter, and witness Iris hand over authenticated family copies before the reopened inquiry. Choices about an early mainland alert, Elias’s account, Iris’s records, and Mara’s oral disclosure change later dialogue and the ending. Wrong routes give recoverable feedback; the launch holds offshore until a safe bearing is confirmed, then travels visibly to the north berth. The hatch sight glass shows the water falling, and Iris emerges after the gate opens. A credited CC0 soft piano loop plays at a low default volume and ducks during storms and dialogue. The full 2–4 hour story arc and the scenes still needed to realize it are outlined in [docs/narrative-design.md](docs/narrative-design.md).

The current story pass adds a playable sea arrival, four hands-on lodge observations, a short fixed-past signing recollection, an optional four-source witness chronology at the detention gatehouse, a four-station tower comparison, a grounded radio-house confrontation, staged rescue, a four-station family return, and a six-question reopened inquiry. The memory asks players to inspect the carbon warning, deadline pressure, and missing relay source. The gatehouse scene compares the captain’s dated intake entry with his hearing statement, a later deckhand account, and Mara’s draft; it cannot establish lamp state without the original relay strip. Wrong interpretations can be corrected; they never offer a way to rewrite the old decision. The chapter picker on the main menu starts any chapter with earlier evidence and puzzle outcomes supplied; each chapter selection uses a separate save slot.

The opening and chapter-entry loading screen stays up while the island builds, requested models and textures finish loading, and the first chapter view renders. Its resource count reflects actual loads; the later scene-preparation phase has no invented percentage. Walking, driving, and touch input stay paused until the view is ready. During ordinary play, **Drone View** lets you fly a separate camera above the island and sea. It does not move Mara, collect evidence, change the investigation, or replace the saved on-foot position.

Three short in-engine scenes frame the ferry landing, Iris's service-hatch rescue, and the daybreak return to North Inlet Jetty. Each starts only after its story condition is earned, plays once per save, and has a visible Skip/Continue button. Escape skips, and reduced-motion mode holds the normal gameplay camera while the scene text plays. Movement and puzzle timers pause, then the original view and controls return. Their camera and rescue animation timelines use bounded real time so a slow frame rate does not stretch a short scene into a long wait.

At the Chapter 3 survey stakes and north inlet, moving offshore mist changes visibility without making photographs depend on a timed clear window. The North Jetty has separated wet timber boards, a numbered depth staff, three temporary floats marking the measured approach, and a western shelf warning float. The floats describe the present-day channel, not the wreck-night lamp circuit.

The Signal Tower control room stands apart from the exposed standby beacon, leaving the eastern survey sightline clear. The field camera marks the actual projected lamp centers on its saved photograph, so the aligned pair remains legible in rain and haze. After pinning both photographs, players can make an optional three-step comparison at the tower plotting rail: qualify the lodge-window reflection, preserve Mara's old dismissal with a dated annotation, and record that present-day geometry cannot establish the old switch state. The note and its source limits are saved in the journal.

The latest scene pass adds a four-beat exchange with Iris after she reaches safety: request medical help, protect her sealed originals, record only what she directly observed, and defer a formal statement until she has rested. Its progress is saved, and wrong conclusions can be corrected. The island-loop ledger, distress form, service order, bypass sketch, relay strip, and correction terminal also have distinct 3D props. The pump house has an original period diesel set, centrifugal pump, gauges, valves, conduits, sight glass, pooled water, and small pipe drips. Generator and pump flywheels, status lamps, gauges, and the tunnel water reading respond to the rescue sequence; the two machine bodies block walking while leaving the center aisle and evidence accessible. Resident figures now make small gestures and brace against the storm.

Players can walk to the high cliff crest. Stepping beyond its lip triggers a brief first-person fall and sea impact, then returns them to the last validated inland position. The landing coves and pier retain their graded routes. The fall uses synthesized sound, a short visual fade, and reduced-motion handling; the transient offshore position is never saved.

The island now has small flocks of seabirds, scattered sheep, and shy rabbits. Their movement avoids roads, cliffs, and buildings, and severe weather quiets the wildlife. Up to two anonymous staff cars travel the existing service roads with visible drivers and yield near the player. These ambient cars are separate from the three vehicles the player can drive and from the named witnesses needed for the investigation.

The lodge service wagon parks in a short graded pull-in rather than on the through road. The main carriageway stays open, while the wagon can drive out onto it.

Chapter 1 begins aboard an original weathered passenger ferry with a textured timber deck, pitted painted-steel hull, contoured hull stripes, wheelhouse, railings, and deck fittings. The skipper pauses just short of South Landing when a loose mooring line catches the keel guard; the bow lurches and leaves a broken ring of foam in the cross-swell. Reopen the crossing notes with E to point out the clear channel; the skipper can also free the ferry after a short wait. This beat and its crossing observations resume from the browser save. Far offshore, a supply coaster, trawler, and cutter pass occasionally, while separate wind-driven swell banks appear in the open sea. These are distant scenery and do not intersect the landing or rescue routes.

The North Inlet rescue launch now uses a textured, weathered procedural hull, cabin, deck fittings, and running lights rather than the older small Blender boat model. Its saved rescue route and offshore holding behavior remain the same.

After the ferry docks, the field map marks South Pier and its boardwalk to South Landing. The mapped route follows the cove slope, with a solid pale line distinguishing it from older foot trails. A fresh Chapter 1 production-browser walk after disembarkation verified uninterrupted dark timber planks across the former rock-textured overlap near z=335–337 and normal boardwalk traversal.

The field map can suggest the next earned landmark and circle it with **Circle Next Lead**. It waits until disembarkation before suggesting land evidence, keeps hidden locations off the map until Mara finds their route, and leaves manual pencil marks available. In Chapter 3, West Headland and the West Survey Stake have separate marks; the survey lead and its saved circle point to the actual camera post. Bearings are straight-line guides; roads and trails remain the safe approaches.

The pause menu and field journal now offer **Case Recap** for a player returning to a saved investigation. It summarizes only recorded observations, labels their sources, and keeps a witness's claim separate from what the physical record proves. Its current lead matches the objective shown in play, including the opening ferry crossing.

The detention annex has a temporarily staffed holding wing: two guards watch the gate, two more cover the yard and cell block, and eight detainees remain behind barred cells. Their instanced procedural figures have shaped workwear, caps, faces, and boots; they make small idle movements and offer short ambient conversations without adding unverified testimony to the evidence journal. Opaque paneled ceilings cover the cell block, infirmary, and administration rooms; the main entrance now leads straight into the corridor. The watchtower bases and folded gate leaves block walking at their modeled positions while the yard route remains open. Sea and surf recordings are mixed lower so wind, dialogue, and the soft piano remain comfortable to hear.

At the Chapter 5 service hatch, the bleed handwheel, keeper pin, release handwheel, and outer bolt move as the player works each saved step. The lid itself hinges open after release. Reloading a partially completed rescue shows the corresponding physical positions.

Residents turn toward the player at conversation distance and make restrained speaking gestures. Their CC0 models load only when their character is present and nearby; each successful load now releases its hidden procedural stand-in while preserving the fallback if loading fails. Eleven more case records now have distinct original 3D forms and marked faces, including the archive's draft and late revision, a gatehouse ledger, tower instructions, a coastal weather reel, and the rising-water mark. Settled weather colors and trail calculations avoid repeated CPU work while preserving the same terrain and weather output.

The archive records and signing stations sit in the visible front aisle or on the central table. Shelves and the table block walking at their modeled positions, while a save made inside newly solid furniture can still move outward. The Radio House receiver console and Elias’s worktable also block walking at their modeled footprints, with the south doorway and evidence approaches kept open. If the worktable still needs the wreck-night service order, the HUD names its Pump House north-wall location and the map points there before returning to the Radio House. In Daybreak, the required custody action is at Iris herself, so approaching her opens the evidence handoff before her optional conversation. Automated route checks cover the required clue and station approaches; a complete human campaign playthrough remains part of the desktop release gate.

## Run locally

You need Node.js compatible with this project's Vite version (`^20.19.0` or `>=22.12.0`) and a modern desktop browser with WebGL and pointer-lock support. Chrome or Edge is a practical choice. Open a terminal **in this folder**, then run:

```powershell
npm install
npm run dev
```

Open the local address printed by Vite. Set **Soft Piano** on the main menu to your preferred level, including **0** for weather and effects without music. **Sea Ambience** separately controls the subdued surf and waves; setting it to **0** leaves wind, rain, dialogue cues, and piano audible. Click **Arrive on the Island** to begin and allow the browser to start audio. Both volume controls are also on the pause screen and keep their settings across reloads. Headphones help with the weather and radio sounds. The game needs a local web server; opening `index.html` directly as a file is not the supported way to run it.

Use **Select Chapters** on the main menu to start or continue any chapter. Later chapter starts include a canonical set of prior case records and contain story spoilers. The main campaign save remains intact. If a selected chapter slot advances, the menu shows its current chapter on **Continue** while **Restart This Chapter** still identifies the originally selected slot. The loading screen remains visible until that chapter's assets and playable view are ready. During the opening crossing, use the on-screen actions to verify the pier with the skipper. If the ferry catches before the dock, press E to help identify the clear channel; the skipper will also free it after a short wait.

For a development comparison, add `?grass=original` to the local URL to use the earlier grass renderer. That fallback uses the credited Poly Haven Leafy Grass and Withered Grass textures.

To make and serve a production build:

```powershell
npm run build
npm run beta
```

The build goes to `dist/`. It includes the GLB models and audio assets from `public/assets/`.

For performance checks, append `?perf=1` to the production URL and play in a visible foreground browser for at least 15 seconds without opening a menu. This opt-in overlay reports median and 1% low frame rate, main-thread frame time, draw calls, triangles, and live geometry and texture counts over a rolling 15-second sample. It clears the sample on pause or tab hiding. Record the browser, device, resolution, chapter, weather, and location with each reading. These numbers do not measure GPU execution time; automated browser control and background tabs can distort frame pacing. Normal play does not create the overlay or collect its samples.

## Controls

| Input | Action |
| --- | --- |
| WASD | Walk; when driving, W accelerates, S reverses, and A/D steer; in Drone View, fly relative to the view |
| Mouse | Look around, including in Drone View |
| Shift | Run on foot; boost flight speed in Drone View |
| G | Enter or leave Drone View during normal play |
| Space / Ctrl, in Drone View | Rise / descend |
| E | Inspect evidence and scene stations, speak to people, enter/exit a nearby car, or reopen crossing notes and help the skipper |
| Space, when driving | Brake |
| M | Open the field map; circle a landmark for a saved bearing and straight-line distance |
| J | Open the evidence journal and its Case Recap |
| B | Open the case board and link evidence |
| F | Toggle flashlight |
| U | Mute or unmute audio |
| Esc or the in-game Menu button | Pause active gameplay; adjust piano and sea volume, open Case Recap, journal, or case board, resume, or return to the main menu |
| During a short scene: Esc or Skip | Skip the scene and return to play; Enter or Continue advances from its final frame |
| At survey stake: mouse / arrow keys | Aim the field camera at both lights |
| At survey stake: wheel / +/- | Zoom until the pair fits the frame |
| At survey stake: Space / click | Take a photograph after holding a steady alignment |
| Landscape touch: left stick | Walk, or steer while driving |
| Landscape touch: drag on the right | Look around or aim the survey camera |
| Landscape touch: action button | Inspect, talk, enter or exit a car, and reopen ferry notes |
| Landscape touch: top buttons | Pause, journal, map, case board, flashlight, audio, and toggle Drone View |
| Landscape touch: survey buttons | Zoom, take a photograph, or exit the camera |
| Landscape touch: driving buttons | Hold accelerate, brake, or reverse while steering |
| Landscape touch: Drone View | Left stick flies, drag right to look, hold Up/Down to change altitude or Boost for faster flight; the action button exits |

The two survey stakes in Chapter 3 require the player to position, aim, zoom, and hold the camera. Both lights must be visible in the correct bearing. At the east stake, keep the aligned frame steady until the intermittent standby lamp lights and the shutter becomes available. The flash uses bounded wall time so its timing stays usable on slower frames. The map shows the service trails and your position.

## Progress and saves

Evidence, signing-memory cues and conclusions, witness topics, gatehouse chronology, and worktable findings, field-camera captures, archive and tower comparisons, case-board conclusions, radio route, rescue launch position and hatch staging, jetty family-handoff progress, viewed and pending short scenes, choices, final-report state, chapter progress, location, vehicle positions and current seat, view direction, flashlight state, and mute setting save automatically in the browser's `localStorage` when you find evidence and periodically while playing. **Continue Investigation** resumes that local save. **Start a New Investigation** clears it. Saves belong to this browser profile and site origin and are not synchronized across devices; private browsing or clearing site data may remove them. Saves from the previous build that already reached the inquiry reopen at Daybreak until the family return is played.

The crossing, lodge comparison, signing recollection, and reopened inquiry also resume from saved state. After the family handoff, the journal or pause menu can reopen the inquiry at its saved question. Each selected chapter has its own save; **Restart This Chapter** clears only that chapter slot. The main campaign and the other chapters stay available.

Drone View is a temporary camera mode. Returning from flight restores the on-foot view at Mara's unchanged position; drone coordinates do not enter the browser save.

## Release plan

This is the desktop beta of the full six-chapter game. Landscape touch controls and hardware-based mobile rendering profiles are included; small-screen survey and driving HUD overlap has been corrected, and separate finger holds no longer cancel another finger's pedal input. A fresh-player pacing run and real-device performance checks are still required. The remaining work is tracked in [docs/release-plan.md](docs/release-plan.md). The current production build is live on Firebase Hosting at the URL above; future builds require a new deployment.

## Rebuild the Blender models

The game can run with the supplied `.glb` files. To regenerate the original procedural building and boat models after editing `tools/build_assets.py`, run this from the project folder with Blender 5.1:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b --python .\tools\build_assets.py
```

If `blender` is on your PATH, `blender -b --python tools/build_assets.py` is equivalent. The script writes six GLB files to `public/assets/`. Reload the development server page or rebuild after regeneration.

## Current limits

- This is a compact playable investigation and visual foundation. Art, pacing, character animation, voice performance, and a wider range of interaction still need substantial work before a full-length release.
- Weather changes with chapters; it is authored for the story rather than a physical weather simulation. Cloud volume sampling, lightning, surf, rain, grass movement, and wet-glass effects are stylized in real time.
- Evidence and resident conversations use proximity prompts and player-controlled survey viewpoints. Collision covers the main building walls, pump-house drive assemblies, closed service buildings, tree trunks, large rocks, prison walls, and vehicles; smaller decoration can still be walked through. Driving is a low-speed kinematic model, not a full tire/suspension simulation. All four named residents have skinned CC0 character models and subtle idle motion; prison occupants are procedural figures. Dialogue is text; voiced performances and full character animation are not yet present.
- Landscape touch controls cover movement, camera aim, evidence, menus, and driving; the mobile graphics profile lowers render costs based on browser hardware hints. Sustained frame rate, thermal behavior, multitouch driving, audio start, and full chapter flow still need real-device checks before a mobile release claim.

The terrain, buildings, boats, prison, vehicles, roads, procedural character fallbacks, engine tone, weather effects, and original grass fallback were made for this project, with credited CC0 surface textures. The four named residents' meshes, rigs, and texture source maps come from the official MakeHuman CC0 system assets. The final GLBs reference byte-identical shared images under `public/assets/shared_images/`, so keep that folder beside the models when serving or redistributing the game. Default grass uses the [WindSweptGrass MIT module](https://gist.github.com/kitchenbeats/7e80e53ee4cc1a3177925f48cdf61793); tree geometry comes from [EZ-Tree](https://github.com/dgreenheck/ez-tree) using parameters authored for the island. No Grassworks proprietary code or film score is included. The ambience combines credited CC0 recordings with procedural Web Audio synthesis; the piano music is Kistol's CC0 loop. Engine, radio, clue, footstep, creak, and thunder effects are synthesized. See [CREDITS.md](CREDITS.md) for texture and sound provenance and third-party libraries.

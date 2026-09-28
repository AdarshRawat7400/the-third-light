# Named resident character sources and builds

Tamsin Reed, Oren Pike, Elias Ward, and Iris Hale use separate skinned human
characters. The game loads each `public/assets/<name>.glb` only when the player
approaches a resident who is present in that chapter. Their original procedural
figures appear until loading finishes and remain available if loading fails.
Tamsin's tool pouch, Oren's depth jotting board, Elias's belt radio pouch, and
Iris's waterproof document case are original runtime geometry. Prison occupants
remain procedural figures.
Feathered grass clearings at resident standing positions keep bodies readable
without thinning the wider meadow.

## Permission and provenance

The selected character parts come from the official [MakeHuman system assets
CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
The [MakeHuman Community license page](https://static.makehumancommunity.org/about/license.html)
confirms its core assets are CC0. The selected `.mhclo` and `.mhmat` files each
state that they were explicitly released as CC0 in September 2020. The named
copyright holders at that release are Data Collection AB, Joel Palmius, and
Jonas Hauquier. All four builders check those CC0 headers before export.

### Tamsin selected parts

| Part in generated GLB | Source within system pack |
| --- | --- |
| Human mesh, body morphs, game-engine rig | Official MakeHuman core base and game-engine rig |
| Skin | `skins/middleage_caucasian_female` |
| Hair | `hair/short03` |
| Eyes | `eyes/low-poly`, `eyes/materials/brown_eye.png` |
| Eyebrows and eyelashes | `eyebrows/eyebrow001`, `eyelashes/eyelashes01` |
| Utility jacket, shirt, jeans | `clothes/male_casualsuit05` |
| Brown work shoes | `clothes/shoes01` |

### Iris selected parts

| Part in generated GLB | Source within system pack |
| --- | --- |
| Human mesh, body morphs, game-engine rig | Official MakeHuman core base and game-engine rig |
| Skin | `skins/young_caucasian_female2` |
| Ponytail | `hair/ponytail01` |
| Eyes | `eyes/low-poly`, `eyes/materials/brown_eye.png` |
| Eyebrows and eyelashes | `eyebrows/eyebrow001`, `eyelashes/eyelashes01` |
| Slate-blue work shirt and jeans | `clothes/male_casualsuit01` |
| Brown shoes | `clothes/shoes01` |

### Oren selected parts

| Part in generated GLB | Source within system pack |
| --- | --- |
| Human mesh, body morphs, game-engine rig | Official MakeHuman core base and game-engine rig |
| Older male skin | `skins/old_caucasian_male` |
| Short hair | `hair/short04` |
| Eyes | `eyes/low-poly`, `eyes/materials/brown_eye.png` |
| Eyebrows and eyelashes | `eyebrows/eyebrow001`, `eyelashes/eyelashes01` |
| Weathered coat and trousers | `clothes/male_casualsuit05` |
| Worn hat | `clothes/fedora01` |
| Brown work shoes | `clothes/shoes01` |

### Elias selected parts

| Part in generated GLB | Source within system pack |
| --- | --- |
| Human mesh, body morphs, game-engine rig | Official MakeHuman core base and game-engine rig |
| Middle-aged male skin | `skins/middleage_caucasian_male` |
| Short hair | `hair/short02` |
| Eyes | `eyes/low-poly`, `eyes/materials/brown_eye.png` |
| Eyebrows and eyelashes | `eyebrows/eyebrow001`, `eyelashes/eyelashes01` |
| Blue work shirt and trousers | `clothes/male_casualsuit01` |
| Dark shoes | `clothes/shoes04` |

The official [MPFB 2.0.17 Blender extension](https://extensions.blender.org/add-ons/mpfb/)
is used only as an offline modeling/export tool. Its GPL code is not bundled
with the game. The generated GLBs contain only the selected CC0 character
parts and their derived geometry; their CC0 texture maps are distributed as
shared image files alongside the GLBs. The 267 MB system
source pack stays outside the project, under `../../work/character_sources`.
No third-party body, clothing, texture, or voice asset from another site is
used for these models.

### Exact downloads used

- Official MPFB extension ZIP:
  `https://extensions.blender.org/download/sha256:4f0a879d64a39bf646fbf5f53601ac678855da329d650617dca5737548239a87/add-on-mpfb-v2.0.17.zip?repository=%2Fapi%2Fv1%2Fextensions%2F&blender_version_min=4.2.0`
  SHA-256: `4F0A879D64A39BF646FBF5F53601AC678855DA329D650617DCA5737548239A87`.
- Official CC0 system pack:
  `https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip`
  SHA-256: `B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107`.
  The mirror at `https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip`
  serves the same pack if the first host is slow.
- Distributed `public/assets/tamsin.glb` SHA-256:
  `AF1C1FF1254026142257F2FA58D622F40297800C655857A57E2823D68C7330BD`.
- Distributed `public/assets/iris.glb` SHA-256:
  `4BF4ABC44DC17BF50EF0B3F70696BF516281B4F512142FCEAAB441683022D0E0`.
- Distributed `public/assets/oren.glb` SHA-256:
  `76376BA2C1DCF4ADDA6DD58D58EB2D33978B367DFC7793FBEBDE0C0039C95C87`.
- Distributed `public/assets/elias.glb` SHA-256:
  `605A8D1F42304F796EA50041B441F59DF778B567430857F52EDE62943B6C0821`.

## Regenerate

1. Install Blender 5.1. Download the two official ZIPs above and verify their
   hashes. Place them at `../../work/character_sources/mpfb-2.0.17.zip` and
   `../../work/character_sources/makehuman_system_assets_cc0.zip`, relative to
   the game project folder.
2. Extract the MPFB ZIP so its `blender_manifest.toml` is at
   `../../work/character_sources/mpfb/blender_manifest.toml`.
3. From the game project folder, run:

   ```powershell
   & 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b --factory-startup --python .\tools\build_tamsin_candidate.py
   & 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b --factory-startup --python .\tools\build_iris_candidate.py
   & 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b --factory-startup --python .\tools\build_oren_candidate.py
   & 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b --factory-startup --python .\tools\build_elias_candidate.py
   ```

The scripts extract only the selected CC0 asset directories into `work/`,
check source headers, create the human and game-engine rig, bake a neutral
standing rest pose, export `../../work/character_sources/<name>-candidate.glb`,
and render `../<name>-mpfb-candidate.png` for review. Each editable `.blend`
stays in `work/`. After visual review, use the pixel-exact texture repacker
to write the distributed GLBs, then update hashes in this file and `CREDITS.md`
if they change:

```powershell
python .\tools\repack_character_webp.py ..\..\work\character_sources\tamsin-candidate.glb --out .\public\assets\tamsin.glb
python .\tools\repack_character_webp.py ..\..\work\character_sources\iris-candidate.glb --out .\public\assets\iris.glb
python .\tools\repack_character_webp.py ..\..\work\character_sources\oren-candidate.glb --out .\public\assets\oren.glb
python .\tools\repack_character_webp.py ..\..\work\character_sources\elias-candidate.glb --out .\public\assets\elias.glb
python .\tools\deduplicate_glb_images.py
python .\tools\deduplicate_glb_images.py --verify
```

The repacker requires Pillow and converts embedded PNG maps to lossless WebP,
checking that every decoded RGBA pixel is identical before writing. Its GLBs
declare `EXT_texture_webp` as required, so playback needs a browser with WebP
support; the current Three.js `GLTFLoader` handles that extension. The
deduplicator moves repeated image bytes from all ten game GLBs into 33 distinct
files under `public/assets/shared_images/`, while retaining the original
geometry and material data. Its manifest at
`tools/glb_shared_images_manifest.json` records source and delivered GLB
hashes, per-image hashes, and geometry-view hashes; `--verify` checks the
distributed files against it. The four final GLB files are 1,001,532 bytes
(Tamsin), 1,501,016 bytes (Iris), 1,039,252 bytes (Oren), and 1,379,436 bytes
(Elias), plus their referenced shared images. All ten GLBs and images total
48,564,460 bytes, saving 21,461,132 bytes from the preceding embedded-image
files. Source PNGs remain unchanged in the offline CC0 pack.

Tamsin's asset has seven skinned meshes and 27,786 triangles. A Chrome
Three.js review confirmed its opaque and alpha-mask materials, and a live
Chapter 1 fixture confirmed scale, ground placement, player-facing direction,
procedural fallback replacement, and Tamsin's existing E conversation. The
game test URL is `/?test=arrival_registry&stage=tamsin` on a development
server. The normal map in the jacket is 4096 px; texture reduction has not
been accepted without a close-up comparison.

Iris's asset has seven skinned meshes and 41,576 triangles. A Blender studio
render checked its shirt, face, ponytail, shoes, and
neutral pose. A live Chapter 6 browser check showed Iris on the cleared trail
at the daybreak handoff, grounded and visible through the meadow. The game
loads her model only after rescue and near approach; tests cover the procedural
fallback and preserve the GLB ground offset through idle and rescue walking.
In Chapter 5 browser QA, she climbed out after the hatch sequence, then stood
on the grass-cleared path at the rescue rest point. The in-app browser reported
no errors or warnings. Her browser review URLs are `/?chapter=6` and
`/?test=iris_rescued&stage=hatch-ready`. The shirt, skin, and ponytail source
maps are 2K; their delivered files are shared by relative URI. The 267 MB
source archive is excluded from the game package.

Oren's asset has eight skinned meshes and 28,158 triangles. His hat diffuse
was reduced from 2K to 1K and his coat normal map from 4K to 2K in the
generated candidate, because the hat and jacket occupy much less than those
resolutions in the game view. The official sources were kept untouched; the
studio portrait still shows the coat seams and worn hat. In the Chrome game
fixture `/?test=north_jetty_sounding&stage=oren`, he faces the player, stands
on the sloped north-jetty terrain, and opens his evidence-aware dialogue with E.
The nearby scene reported no browser warnings or errors.

Elias's asset has seven skinned meshes and 39,568 triangles. His blue work
shirt and face were reviewed in a Blender studio portrait. The browser fixture
`/?test=radio_route_verified&stage=elias` places him outside the radio house
after the story route has made him available. He also keeps his procedural
body until his own GLB loads. In Chrome, his full body stood on the wet terrain,
turned toward the player, and opened the Elias dialogue with E, with no browser
warnings or errors. A later Chrome check rendered the repacked Tamsin model at
the south landing and the repacked Iris model on the Daybreak trail, also with
no loader or console warnings. The two new game screenshots are saved as
`../oren-in-game.png` and `../elias-in-game.png` in the outer deliverables folder.

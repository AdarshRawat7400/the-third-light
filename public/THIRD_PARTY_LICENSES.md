# Third-party license notices

## MakeHuman Community CC0 system assets — four named residents

Asset pack: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html  
Core asset licensing: https://static.makehumancommunity.org/about/license.html  
CC0 1.0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode  
Bundled generated models: `assets/tamsin.glb`, `assets/oren.glb`, `assets/elias.glb`, `assets/iris.glb`  
License of the selected core character meshes, rig, materials, and shared texture maps: CC0 1.0

The selected source files are the MakeHuman base mesh and game-engine rig;
`skins/middleage_caucasian_female`, `hair/short03`, and
`clothes/male_casualsuit05` for Tamsin; `skins/young_caucasian_female2`,
`hair/ponytail01`, and `clothes/male_casualsuit01` for Iris;
`skins/old_caucasian_male`, `hair/short04`, `clothes/male_casualsuit05`,
`clothes/fedora01`, and `clothes/shoes01` for Oren;
`skins/middleage_caucasian_male`, `hair/short02`, `clothes/male_casualsuit01`,
and `clothes/shoes04` for Elias; and shared `eyes/low-poly`,
`eyes/materials/brown_eye.png`, `eyebrows/eyebrow001`, and
`eyelashes/eyelashes01`. Tamsin and Iris also use `clothes/shoes01`.
Their `.mhclo` and `.mhmat`
headers explicitly record the September 2020 CC0 release and name Data
Collection AB, Joel Palmius, and Jonas Hauquier as copyright holders at that
release. Attribution here records provenance; CC0 imposes no attribution
condition. MPFB was used offline to generate the model and is not bundled in
the runtime or its source archive.

The distributed GLBs repack these CC0 maps as lossless WebP with decoded
RGBA pixels checked against the original maps. They declare
`EXT_texture_webp` as required; a WebP-capable browser is needed to display
the character textures. See `docs/character-candidate.md` in the source package
for reproduction steps and exact asset hashes.

## Procedural Weather — Three.js Skill

Source: https://github.com/CK42BB/procedural-weather-threejs  
Reference for the authored shader-driven rain module `src/gpuRain.js`  
License: MIT

```text
MIT License

Copyright (c) 2026 Kingsley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## EZ-Tree

Source: https://github.com/dgreenheck/ez-tree  
Package: `@dgreenheck/ez-tree` 1.1.0  
License: MIT

```text
MIT License

Copyright (c) 2024 Daniel Greenheck

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## WindSweptGrass

Source: https://gist.github.com/kitchenbeats/7e80e53ee4cc1a3177925f48cdf61793  
Bundled module: `src/grass/WindSweptGrass.js`  
License: MIT

```text
MIT License

Copyright (c) 2026 J Hanlon / I Dream Of AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## webgl-noise shader functions

Source: https://github.com/ashima/webgl-noise  
Bundled use: simplex noise functions in `src/ezTreeGeometry/tree.js`, inherited from EZ-Tree's tree sway shader  
License: upstream permissive software notice

```text
Copyright (C) 2011 by Ashima Arts (Simplex noise)

Copyright (C) 2011-2016 by Stefan Gustavson (Classic noise and others)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## CC0 media and material provenance

The project includes CC0 material maps from [Poly Haven](https://polyhaven.com/license): [Coast Sand Rocks 02](https://polyhaven.com/a/coast_sand_rocks_02), [Rock Ground](https://polyhaven.com/a/rock_ground), [Rock Face](https://polyhaven.com/a/rock_face), [Wood Peeling Paint Weathered](https://polyhaven.com/a/wood_peeling_paint_weathered), [Brown Planks 03](https://polyhaven.com/a/brown_planks_03), [Rough Concrete](https://polyhaven.com/a/rough_concrete), [Rusty Metal 04](https://polyhaven.com/a/rusty_metal_04), [Leafy Grass](https://polyhaven.com/a/leafy_grass), [Withered Grass](https://polyhaven.com/a/withered_grass), and [Knotted Pine Bark](https://polyhaven.com/a/knotted_pine_bark).

The recorded ambience is offered under CC0 on the original OpenGameArt submissions: [Beach Ocean Waves](https://opengameart.org/content/beach-ocean-waves) by jasinski, submitted by qubodup; [wind whoosh loop](https://opengameart.org/content/wind-whoosh-loop) by SketchMan3, based on [Loopable Dungeon Ambience](https://opengameart.org/content/loopable-dungeon-ambience) by JaggedStone; [AMB Rain Loop 1](https://opengameart.org/content/amb-rain-loop-1) by Kresiek The Furry; and [Rain on Window Loop](https://opengameart.org/content/rain-on-window-loop) by alxl (CC0 option on its multi-license page). The piano track is Kistol's CC0 [Forget Me Not in F Major](https://opengameart.org/content/forget-me-not), looped Ogg version. CC0 permits distribution without attribution; these credits document provenance.

## Three.js 0.180.0

Source: https://github.com/mrdoob/three.js  
Bundled use: browser renderer and GLB loading  
License: MIT, copied from `node_modules/three/LICENSE`

```text
The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## DM Sans and Libre Baskerville fonts

Bundled source packages: `@fontsource/dm-sans` 5.3.0 and `@fontsource/libre-baskerville` 5.3.0. The production build includes the font files needed by the interface. The copyright lines below and the complete SIL Open Font License are copied from their installed `LICENSE` files.

```text
Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts) DMSans-Italic[opsz,wght].ttf: Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts)

Copyright 2012 The Libre Baskerville Project Authors (https://github.com/impallari/Libre-Baskerville) LibreBaskerville-Italic[wght].ttf: Copyright 2012 The Libre Baskerville Project Authors (https://github.com/impallari/Libre-Baskerville)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------
PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

# Asset provenance

## Palm tree

- Creator: Quaternius.
- Pack: [Ultimate Stylized Nature](https://quaternius.com/packs/ultimatestylizednature.html).
- Original asset license: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), as linked on the pack's official page, checked 6 September 2026.
- Download mirror: [Walter H. Palladino's Godot conversion](https://github.com/walterpalladino/godot-quaternius-ultimate-stylized-nature), `ultimate-stylized-nature/sources/FBX/PalmTree_1.fbx` and `sources/Textures/PalmTree_Leaves.png`.
- Shipped files: `public/models/palm-source.fbx`, `palm-leaves.png`, and converted `palm.glb`.
- Changes: reset the imported child's rotation to match the mirror's prefab, normalize to seven units high, discard heavy trunk textures/normal maps, embed the leaf alpha texture in GLB. Runtime clones share geometry and texture, with lit green foliage, varied scale/rotation, terrain grounding, and alpha-to-coverage.
- The mirror uses the MIT license, reproduced below for completeness. No Godot application code is used.

MIT License

Copyright (c) 2025 Walter H. Palladino

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Desert vegetation and formations

- Creator: [Kenney](https://kenney.nl/assets/nature-kit), Nature Kit 2.1.
- License: CC0 1.0 Universal. Original notice ships in `public/models/desert/LICENSE.txt`.
- Shipped GLBs: `cactus_tall`, `cactus_short`, `plant_bush`, `plant_bushSmall`,
  `cliff_cave_rock`, `rock_tallA`, `rock_tallH`, and `rock_largeA`, in `public/models/desert/`.
- Official download and inspection notes: [oasis-terrain-references.md](oasis-terrain-references.md).
- Runtime changes: normalize and merge source meshes, replace metallic materials
  with muted sandstone/sage diffuse lighting, instance plants and rocks, compose
  the cave opening with buttes and an uneven boulder crown. Terrain/water clipping
  and existing storm fog keep these grounded throughout the reveal and flood.

## Typography and references

Constellation coordinates are adapted from Olaf Frohn's d3-celestial, BSD-3-Clause. The complete notice is included in `public/constellation-license.txt` and ships with the website. Research and specific pattern choices are documented in `docs/constellation-references.md`.

Small shoreline stones and grass/reed geometry are original code-native assets.
The larger desert formations use the Kenney models credited above. Alto’s Odyssey
screenshots and the user-provided reference are used for composition only and are not shipped.

DM Sans and Manrope are served by Google Fonts under the SIL Open Font License. Sans-serif system fonts remain available if the font service fails. Reference imagery from Journey, ABZÛ, Three.js, and Webb is used for visual study only and is not shipped in the website. Three.js is MIT-licensed; shaders here are original implementations informed by its demonstrations rather than copied source.

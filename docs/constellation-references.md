# Constellation reference notes

Research checked 2026-09-07. Intended use: a sparse, recognizable star-pattern composition, not a navigational sky chart.

## Primary references and provenance

- [NASA: What are constellations?](https://spaceplace.nasa.gov/constellations/en/) shows Orion and the Big Dipper in actual photographs, identifies Orion's three-star belt, and explains that cultures have used different constellation groupings; 88 constellations are officially recognized today.
- [NASA: What are asterisms?](https://solarsystem.nasa.gov/news/1945/what-are-asterisms/) explicitly identifies the Big Dipper as an **asterism within Ursa Major**, not a separate constellation.
- [d3-celestial constellation line data](https://github.com/ofrohn/d3-celestial/blob/7e720a3de062059d4c5400a379146a601d9010e0/data/constellations.lines.json) supplies the `Ori`, `Cas`, and `UMa` coordinate chains below. Its [first-party README, data sources](https://github.com/ofrohn/d3-celestial/blob/7e720a3de062059d4c5400a379146a601d9010e0/readme.md#files) attributes constellation lines to IAU charts with some modifications by Olaf Frohn. It states positions are J2000, right ascension converted into signed degrees, followed by declination. Do not misattribute this line dataset to Stellarium: that is separately credited for other data.
- The upstream IAU constellation page could not be retrieved in this research session. Accordingly the directly verified line reference is the published d3-celestial data, not a claim of individually reviewing IAU chart artwork. Connecting lines are an illustration convention, not physical connections or the definition of constellation boundaries.

## Recommended exact pattern subsets

Coordinates below are `[signed RA degrees, declination degrees]`, copied from the reference line data. Names identify familiar stars; implementation may use Bayer designations.

### Orion: shoulders, waist, feet, and belt

Betelgeuse `[88.7929, 7.4071]`; Bellatrix `[81.2828, 6.3497]`; Mintaka `[83.0017, -0.2991]`; Alnilam `[84.0534, -1.2019]`; Alnitak `[85.1897, -1.9426]`; Saiph `[86.9391, -9.6696]`; Rigel `[78.6345, -8.2016]`.

Use Betelgeuse–Bellatrix, Bellatrix–Mintaka, Mintaka–Rigel, Rigel–Saiph, Saiph–Alnitak, Alnitak–Betelgeuse, plus the belt Mintaka–Alnilam–Alnitak. This is an intentionally simplified, recognizable hourglass/belt illustration: the reference's longer Orion figure includes a star between Mintaka and Rigel, a head, arms, and shield. The direct Mintaka–Rigel and Rigel–Saiph connections are our simplification, not a verbatim copy of that entire stick figure. Omit arms/head to avoid a tangled appearance.

### Cassiopeia: five-star W

Use the single chain epsilon/Segin `[28.5989, 63.6701]` → delta/Ruchbah `[21.454, 60.2353]` → gamma `[14.1772, 60.7167]` → alpha/Schedar `[10.1268, 56.5373]` → beta/Caph `[2.2945, 59.1498]`. No extra chords or closing edge.

### Big Dipper: bowl and handle

Megrez `[-176.1435, 57.0326]` → Dubhe `[165.932, 61.751]` → Merak `[165.4603, 56.3824]` → Phecda `[178.4577, 53.6948]` → Megrez closes the four-star bowl. Continue from Megrez → Alioth `[-166.4927, 55.9598]` → Mizar `[-159.0186, 54.9254]` → Alkaid `[-153.1148, 49.3133]` for the handle. Exclude the rest of Ursa Major's bear figure.

## Rendering guidance and scientific caveats

These are design recommendations, not scientific claims: favor three separated groups over a proximity graph; keep star nodes brighter than their thin lines; leave negative space for copy; reveal edges sequentially without changing topology. Keep background particles unconnected. Avoid different depth values for stars within a pattern that would distort its shape as the camera moves.

Use a local sky projection (e.g. gnomonic) or at minimum wrap RA differences at 180° and multiply horizontal offsets by cosine of central declination. A plain RA/declination plot badly stretches Cassiopeia and the Dipper; the Dipper crosses the signed-RA wrap. Increasing RA normally runs left in a north-up observer-facing chart. Uniformly scaling/rotating/translating whole groups is suitable for this artistic arrangement, but their relative screen placement then no longer represents true angular separation, observing time/location, or physical star distances. Do not call the result a scientifically accurate shared sky map.

## License requirements

Layered revision: added the `Cyg`, `Lyr`, and `CrB` coordinate chains from the same d3-celestial dataset. Cygnus uses its two crossing chains, Lyra its small triangle and parallelogram, and Corona Borealis its open seven-star arc. The composition now has 42 stars and 40 edges. Six distinct coplanar group depths preserve the individual shapes; dimmer distant groups and larger foreground groups create illustrative depth, not a claim about actual stellar distances.

Implementation note: the final Orion subset includes Meissa `[83.7845, 9.9342]` above the shoulders, with its two head-to-shoulder edges. It omits the bottom foot-to-foot edge. There are 20 stars and 19 edges in total across all three groups. The full BSD notice ships in `public/constellation-license.txt`.

The [repository license](https://github.com/ofrohn/d3-celestial/blob/7e720a3de062059d4c5400a379146a601d9010e0/LICENSE) is BSD-3-Clause, copyright (c) 2015 Olaf Frohn. When adapting its coordinate/line data, retain the complete copyright, conditions, and disclaimer in source and reproduce them in distributed documentation/materials. A short attribution alone is insufficient. Add the full notice to the project's asset-license documentation or a distributed third-party notice, and reference that notice from the implementation. Do not imply endorsement. No NASA/IAU photographs or chart artwork need to ship; they are references only.

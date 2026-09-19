# Distant wave coverage regression

The 80-iteration broad-swell trace exhausted its budget on grazing rays. Adjacent rays could hit a crest while those beneath it returned sky. A hard 650-unit trace boundary also cut off distant swell silhouettes.

The trace now permits 512 iterations (with the same early exits), and broad displacement resolves smoothly to the mean-water horizon between 300 and 600 units. No extra fog is used to conceal the gaps.

`node scripts/check-ocean-gaps.mjs` compiles the actual world shader and checks water coverage in vertical pixel columns at progression 2 over 12 pinned aspect/time combinations. All have zero sky pixels below visible water. `--replay-old` restores the former trace and displacement behavior; seven cases fail, with up to 175 gap pixels. This diagnostic deliberately excludes later underwater overlays and is scoped to open-ocean coverage.

Typecheck and 20 unit/database tests pass. Desktop hardware-WebGL capture at 1440×960 reports 30 fps on RTX 4070 Ti SUPER (DPR 1); this is not physical-mobile performance validation.

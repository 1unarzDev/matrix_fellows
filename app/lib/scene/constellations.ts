// Selected J2000 star positions from d3-celestial / IAU chart patterns.
// Sources, projection notes, and BSD license: docs/constellation-references.md.
const patterns = [
  // Keep every star within a pattern coplanar to preserve its recognizable shape.
  {
    name: 'Orion',
    stars: [
      [88.7929, 7.4071],
      [81.2828, 6.3497],
      [83.7845, 9.9342],
      [85.1897, -1.9426],
      [84.0534, -1.2019],
      [83.0017, -0.2991],
      [86.9391, -9.6696],
      [78.6345, -8.2016],
    ],
    edges: [
      [0, 2],
      [2, 1],
      [1, 5],
      [5, 4],
      [4, 3],
      [3, 0],
      [3, 6],
      [5, 7],
    ],
  },
  {
    name: 'Cassiopeia',
    stars: [
      [28.5989, 63.6701],
      [21.454, 60.2353],
      [14.1772, 60.7167],
      [10.1268, 56.5373],
      [2.2945, 59.1498],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: 'Big Dipper',
    stars: [
      [183.8565, 57.0326],
      [165.932, 61.751],
      [165.4603, 56.3824],
      [178.4577, 53.6948],
      [193.5073, 55.9598],
      [200.9814, 54.9254],
      [206.8852, 49.3133],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Cygnus',
    stars: [
      [-41.7659, 30.2269],
      [-48.4472, 33.9703],
      [-54.4429, 40.2567],
      [-63.7563, 45.1308],
      [-67.5735, 51.7298],
      [-70.7243, 53.3685],
      [-49.642, 45.2803],
      [-60.9235, 35.0834],
      [-67.3197, 27.9597],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [6, 2],
      [2, 7],
      [7, 8],
    ],
  },
  {
    name: 'Lyra',
    stars: [
      [-78.8068, 37.6051],
      [-78.9051, 39.6127],
      [-80.7653, 38.7837],
      [-76.3738, 36.8986],
      [-75.2641, 32.6896],
      [-77.48, 33.3627],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
  },
  {
    name: 'Corona Borealis',
    stars: [
      [-126.7676, 31.3591],
      [-128.0428, 29.1057],
      [-126.328, 26.7147],
      [-124.3143, 26.2956],
      [-122.6015, 26.0684],
      [-120.6031, 26.8779],
      [-119.6393, 29.8511],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
]

export const constellationStarCount = patterns.reduce(
  (count, pattern) => count + pattern.stars.length,
  0,
)

export function constellationLayout(aspect: number) {
  // Illustrative arrangement, not a single geographic/time-specific sky view.
  // Local projections retain each pattern's aspect; only centers move on mobile.
  const compact = aspect < 1
  const placements = compact
    ? [
        [-0.38, 0.65, 4.2, -10],
        [0.12, -0.68, 6.0, -16],
        [0.2, 1.0, 4.8, -24],
        [0.55, 0.82, 4.0, -52],
        [-0.65, -0.47, 3.8, -65],
        [-0.48, 1.03, 3.4, -80],
      ]
    : [
        [-0.76, 0.13, 10.2, -10],
        [0.6, 0.67, 8.6, -16],
        [0.66, -0.58, 10.6, -24],
        [-0.48, 0.76, 7.0, -52],
        [0.79, 0.14, 6.0, -65],
        [-0.48, -0.65, 6.5, -80],
      ]
  const anchors: number[] = [],
    lines: number[] = [],
    colors: number[] = []
  patterns.forEach((pattern, index) => {
    const ra = pattern.stars.reduce((sum, star) => sum + star[0]!, 0) / pattern.stars.length
    const dec = pattern.stars.reduce((sum, star) => sum + star[1]!, 0) / pattern.stars.length
    const projected = pattern.stars.map((star) => [
      -(star[0]! - ra) * Math.cos((dec * Math.PI) / 180),
      star[1]! - dec,
    ])
    const xs = projected.map((point) => point[0]!),
      ys = projected.map((point) => point[1]!)
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    const [x, y, size, depth] = placements[index]!
    const perspectiveScale = (22 - depth!) / 34
    const points = projected.map((point) => [
      ((point[0]! / extent) * size! + x! * 15 * aspect) * perspectiveScale,
      ((point[1]! / extent) * size! + y! * 15) * perspectiveScale,
      depth!,
    ])
    points.forEach((point) => anchors.push(...point, 1))
    pattern.edges.forEach(([a, b]) => {
      lines.push(...points[a!]!, ...points[b!]!)
      const intensity = index < 3 ? 1 : index === 3 ? 0.46 : 0.3
      colors.push(intensity, intensity, intensity, intensity, intensity, intensity)
    })
  })
  return { anchors, lines, colors }
}

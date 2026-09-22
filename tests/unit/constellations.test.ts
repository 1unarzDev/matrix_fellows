import { describe, expect, it } from 'vitest'
import { constellationLayout, constellationStarCount } from '../../app/lib/scene/constellations'

describe('intentional constellation layout', () => {
  it('uses 42 unique stars and 40 explicit connections across six depths', () => {
    const layout = constellationLayout(1.6)
    expect(constellationStarCount).toBe(42)
    expect(layout.lines.length / 6).toBe(40)
    expect(new Set(layout.anchors.filter((_, i) => i % 4 === 2)).size).toBe(6)
    expect(layout.colors.length).toBe(layout.lines.length)
    expect(layout.starGroups).toHaveLength(constellationStarCount)
    expect(layout.lineGroups).toHaveLength(layout.lines.length / 3)
    expect(new Set(layout.starGroups)).toEqual(new Set([0, 1, 2, 3, 4, 5]))
  })
  it('keeps every line endpoint attached to a star on desktop and mobile', () => {
    for (const aspect of [0.43, 1, 1.6, 2.4]) {
      const { anchors, lines, starGroups, lineGroups } = constellationLayout(aspect)
      const stars = new Set(
        Array.from({ length: constellationStarCount }, (_, i) =>
          anchors.slice(i * 4, i * 4 + 3).join(','),
        ),
      )
      for (let i = 0; i < lines.length; i += 3) {
        expect(stars.has(lines.slice(i, i + 3).join(','))).toBe(true)
        const starIndex = Array.from({ length: constellationStarCount }).findIndex(
          (_, index) =>
            anchors.slice(index * 4, index * 4 + 3).join(',') === lines.slice(i, i + 3).join(','),
        )
        expect(lineGroups[i / 3]).toBe(starGroups[starIndex])
      }
      expect(anchors.every(Number.isFinite)).toBe(true)
    }
  })
})

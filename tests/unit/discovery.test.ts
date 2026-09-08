import { describe, expect, it } from 'vitest'
import { advanceDiscovery } from '../../app/lib/scene/discovery'

describe('discovery ripple visit clock', () => {
  it('waits for the reveal and works on direct chapter entry', () => {
    expect(advanceDiscovery(0, 0.65, 0.033)).toBe(0)
    expect(advanceDiscovery(0, 1, 0.033)).toBeCloseTo(0.033)
  })
  it('does not restart on small reverse scrolls', () => {
    expect(advanceDiscovery(5, 0.9, 0.033)).toBeCloseTo(5.033)
    expect(advanceDiscovery(5, 0.7, 0.033)).toBe(5)
  })
  it('finishes once, rearms outside the chapter and bounds long frame gaps', () => {
    expect(advanceDiscovery(16, 1, 0.1)).toBe(16)
    expect(advanceDiscovery(6, 0.2, 0.033)).toBe(0)
    expect(advanceDiscovery(6, 2, 0.033)).toBe(0)
    expect(advanceDiscovery(0, 1, 10)).toBe(.1)
    expect(advanceDiscovery(3, 1, -1)).toBe(3)
  })
})

import {expect,it} from 'vitest'
import {providerRetryTime} from '../../shared/utils/provider-retry'
it('respects numeric/date retry hints without copying arbitrary response data',()=>{
 const now=Date.parse('2026-10-09T12:00:00Z')
 expect(providerRetryTime('120',now)).toBe('2026-10-09T12:02:00.000Z')
 expect(providerRetryTime('Fri, 09 Oct 2026 14:00:00 GMT',now)).toBe('2026-10-09T14:00:00.000Z')
 expect(providerRetryTime('invalid private response',now)).toBeUndefined()
 expect(providerRetryTime('99999999',now)).toBe('2026-10-10T12:00:00.000Z')
})

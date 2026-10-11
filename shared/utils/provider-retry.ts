/** Only safe scheduling metadata leaves a provider response. */
export function providerRetryTime(header:string|null,now=Date.now()):string|undefined {
 if(!header) return
 const seconds=/^\d+(?:\.\d+)?$/.test(header.trim())?Number(header.trim()):NaN
 const parsed=Number.isFinite(seconds)?now+seconds*1000:Date.parse(header)
 if(!Number.isFinite(parsed) || parsed<=now)return
 return new Date(Math.min(parsed,now+86400000)).toISOString()
}

// Read-only live extraction. No Supabase writes and no guesses on parse failure.
import { fetchSource } from '../workers/adapters.ts'
import { officialProfiles } from '../workers/official-sources.ts'
let failures = 0
for (const profile of officialProfiles) {
  try {
    const [item] = await fetchSource({ ...profile, kind: 'official', enabled: true })
    console.log(
      JSON.stringify({
        source: profile.id,
        eventDate: item.eventDate,
        deadline: item.deadline,
        milestones: item.milestones,
        description: item.description,
      }),
    )
  } catch (error) {
    failures++
    console.error(profile.id, error.message)
  }
}
if (failures) process.exitCode = 1

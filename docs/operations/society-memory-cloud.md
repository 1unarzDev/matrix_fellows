# Society memory cloud

The Society tab is an officer-maintained, append-only memory surface for Matrix Fellows connections and project context. Officers add a pasted email chain, note, or source file; the page closes immediately and the source is queued for background processing. Members can see why this area is restricted, but cannot read or submit society relationship material.

The maintenance workflow is bounded and reviewable:

1. Preserve the submitted source, source date, chapter hint, and submitting officer.
2. Extract people, organizations, dates, project links, and connection signals locally. Uploaded files are treated as data and are never executed.
3. Keep identity and project resolution conservative. The queue reserves separate resolve and project stages for later bounded adapters; the current processor records a source-backed candidate entry. A mention is retained as unreviewed context; it does not establish authorship, availability, recruiting, or a commitment.
4. Project accepted society context into discovery interests and proposal packets. Drafts can reference an active or introduced connection when it matches the target, while keeping the statement qualified for officer review.

Raw source text and derived entries remain service-role records. The officer API returns source metadata and derived context only; it does not return pasted email or note text. The worker can process this queue while opportunity discovery is paused, so a paused discovery schedule does not stall society memory maintenance.

The current local processor is intentionally modest. It recognizes common DFW and Stanford organization names, explicit email headers, ISO dates, and public project links. Unsupported binary files remain honest metadata until a bounded parser is configured. Automatic mailbox reading and reply synchronization remain disconnected.

Deploy migration `20261010110000_society_context_cloud.sql` before enabling the Society tab in a shared environment. Pause or drain the outreach worker during the migration, verify the three new tables and queue functions exist, then deploy the Nuxt application and outreach Worker. The migration is additive and does not rewrite historical relationship or mail records.

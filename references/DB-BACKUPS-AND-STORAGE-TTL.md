# Backups (PITR) and Storage TTL

This note documents our approach to Supabase Point-in-Time Recovery (PITR) and Storage signed URL TTL usage.

## Postgres Backups (PITR)

- Supabase offers PITR (Point in Time Recovery) on Pro tier and higher. It allows restoring the database to an exact timestamp.
- Action items:
  1. Enable PITR in the Supabase project settings (Database → Backups → PITR).
  2. Choose a retention window that matches compliance and cost constraints (e.g., 7–30 days).
  3. Document a restore runbook:
     - Identify the timestamp to restore
     - Create a new database from PITR restore in Supabase
     - Swap application DATABASE_URL to the restored instance for validation
     - Run smoke tests
     - If valid, promote the restored DB or migrate data forward as needed
  4. Create a calendar reminder to verify restore function monthly.

### Restore runbook (summary)

- Trigger restore to a new instance at T0 via Supabase UI.
- Apply read-only app settings to avoid writes during validation.
- Run a sanity verification script (counts, checksum queries, auth probes).
- If good, promote and update envs; otherwise discard.

## Storage Signed URL TTL

- Files are stored in a private `files` bucket. Client access requires signed URLs with TTL.
- We use storage RLS policies to restrict access to staff; server-side code creates signed URLs with a short expiration.
- Recommendations:
  - Default TTL: 5–15 minutes for ephemeral access (e.g., previews)
  - Longer TTLs (1–24 hours) only for controlled sharing cases
  - Never embed long-lived or public URLs for PHI

### Example (server-side) signed URL generation

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!)

export async function getSignedUrl(path: string, expiresInSec = 600) {
  const { data, error } = await supabase
    .storage
    .from('files')
    .createSignedUrl(path, expiresInSec)
  if (error) throw error
  return data.signedUrl
}
```

### Client pattern

- Call an authenticated server route to fetch a signed URL
- Use the URL immediately; do not cache beyond TTL
- Re-request a new signed URL when expired

## Notes

- Storage policies are applied on `storage.objects` and already set to staff read and service-role write for `files` bucket.
- All direct writes to Storage should come from server-side using the service role key.
- For critical artifacts (e.g., receipts), consider storing immutable copies and referencing their paths in the DB.

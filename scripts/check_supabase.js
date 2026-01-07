const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Supabase URL or ANON key missing in apps/web/.env.local');
    process.exit(1);
  }
  if (!/^https?:\/\//.test(url)) {
    console.error('Supabase URL does not look like a valid URL.');
    process.exit(1);
  }
  // Validate anon key format (JWT-like)
  const parts = anon.split('.');
  if (parts.length !== 3) {
    console.error('Anon key is not a valid JWT format.');
    process.exit(1);
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (payload && payload.role && payload.role !== 'anon') {
      console.warn('Anon key payload role is not "anon" (this may still be fine).');
    }
  } catch (_) {
    console.warn('Could not decode anon key payload.');
  }
  // Use the official client to perform a harmless call
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(url, anon);
  const { error } = await client.auth.getSession();
  if (error) {
    console.error('Supabase client call failed:', error.message);
    process.exit(1);
  }
  console.log('Supabase URL and anon key look valid. Client call OK.');
}

main().catch((e) => {
  console.error('Supabase check error:', e.message);
  process.exit(1);
});

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase database client with service role access
 */
class DatabaseClient {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'apikey': supabaseKey,
          },
        },
      });
      console.log('[DatabaseClient] Supabase client initialized with', 
        supabaseKey === process.env.SUPABASE_SERVICE_ROLE ? 'service role (bypasses RLS)' : 'anon key');
    } else {
      throw new Error('[DatabaseClient] Supabase credentials missing - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are required');
    }
  }

  /**
   * Get Supabase client
   */
  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('[DatabaseClient] Supabase client not initialized');
    }
    return this.supabase;
  }
}

// Singleton instance
let dbClient: DatabaseClient | null = null;

/**
 * Get the global Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!dbClient) {
    dbClient = new DatabaseClient();
  }
  return dbClient.getClient();
}

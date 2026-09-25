import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, type BackendConfig } from './config.js';

type SupabaseCredentials = NonNullable<BackendConfig['supabase']>;

export const createSupabaseServerClient = (
  credentials: SupabaseCredentials | null = config.supabase ?? null,
): SupabaseClient => {
  if (!credentials) {
    throw new Error('Supabase server client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
};

let supabaseClient: SupabaseClient | undefined;

export const getSupabaseServerClient = (): SupabaseClient => {
  supabaseClient ??= createSupabaseServerClient();
  return supabaseClient;
};
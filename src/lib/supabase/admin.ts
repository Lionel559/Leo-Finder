import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceEnv } from "@/lib/security";

let cachedAdminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const {
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = getSupabaseServiceEnv();

  cachedAdminClient = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedAdminClient;
}

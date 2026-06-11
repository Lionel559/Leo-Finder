import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  avatar_url: string | null;
  website_url: string | null;
  preferred_roles: string[];
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "support";
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
    readonly code = "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getCurrentUser(
  supabase?: SupabaseClient,
): Promise<User | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getUserProfile(
  userId: string,
  supabase?: SupabaseClient,
): Promise<UserProfile | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
    .from("profiles")
    .select(
      "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfile | null;
}

export async function requireAuth(supabase?: SupabaseClient): Promise<User> {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new AuthError("Authentication required.");
  }

  return user;
}

export async function requireCompletedOnboarding(supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const user = await requireAuth(client);
  const profile = await getUserProfile(user.id, client);

  if (!profile?.onboarding_completed) {
    throw new AuthError(
      "Complete onboarding before accessing this feature.",
      403,
      "ONBOARDING_REQUIRED",
    );
  }

  return {
    user,
    profile,
  };
}

export async function requireAdmin(supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const user = await requireAuth(client);
  const { data, error } = await client
    .from("admin_users")
    .select("id,user_id,role,permissions,is_active,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AuthError("Admin access required.", 403, "FORBIDDEN");
  }

  return {
    user,
    admin: data as AdminUser,
  };
}

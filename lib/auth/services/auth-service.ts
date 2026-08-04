import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const supabase = createBrowserClient();
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const supabase = await createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
}

export async function getCurrentProfile() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function requireAuth() {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Unauthorized");
  }

  if (!profile.is_active) {
    throw new Error("User account is inactive");
  }

  return profile;
}
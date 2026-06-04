import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when both Supabase env vars are present, so online features can load. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

let signInPromise: Promise<string | null> | null = null;

/**
 * Ensures the device has an anonymous Supabase session and returns its user id.
 * The id is stable for the device (persisted) and used as the player's identity.
 */
export async function ensureSignedIn(): Promise<string | null> {
  if (!supabase) return null;
  if (!signInPromise) {
    signInPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const { data: created, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("Anonymous sign-in failed:", error.message);
        return null;
      }
      return created.user?.id ?? null;
    })();
  }
  return signInPromise;
}

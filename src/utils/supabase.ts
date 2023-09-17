import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createBrowserSupabaseClient();

// Sign Out
async function signout() {
  const { error } = await supabase.auth.signOut();
}

export { signout };

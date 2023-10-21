import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createPagesBrowserClient();

// Sign Out
async function signout() {
  await supabase.auth.signOut();
}

export { signout };

import { UseUserContext } from "@/context/User.context";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const supabase = createBrowserSupabaseClient();

// Sign Out
async function signout() {
  const { error } = await supabase.auth.signOut();
}

export { signout };

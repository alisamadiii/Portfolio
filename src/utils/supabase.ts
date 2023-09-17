import { UseUserContext } from "@/context/User.context";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const supabase = createClient(
  supabaseUrl as string,
  supabaseKey as string,
  {
    auth: { persistSession: false },
  }
);

// Sign Out
async function signout() {
  const { error } = await supabase.auth.signOut();
}

export { signout };

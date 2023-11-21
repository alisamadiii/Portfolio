import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

import { Database } from "@/database.types";

export const supabase = createClient<Database>(
  supabaseUrl as string,
  supabaseKey as string
);

// supabase gen types typescript --project-id <supabase ID> > database.types.ts

import { createClient } from "@supabase/supabase-js";

import { type Database } from "@/database.types";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl as string,
  supabaseKey as string
);

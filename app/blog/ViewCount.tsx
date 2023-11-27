import { supabase } from "@/utils/supabase";
import React from "react";

interface Props {
  slug: string;
}

export default async function ViewCount({ slug }: Props) {
  const { data, error } = await supabase
    .from("pages")
    .select("view_count")
    .eq("slug", slug)
    .single();

  if (error) {
    return null;
  }

  return <div className="text-sm text-muted">{data.view_count} Views</div>;
}

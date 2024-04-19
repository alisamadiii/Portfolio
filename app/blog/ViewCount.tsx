"use client";

import { supabase } from "@/utils/supabase";
import React, { memo } from "react";

interface Props {
  slug: string;
}

async function ViewCountElement({ slug }: Props) {
  const { data, error } = await supabase
    .from("pages")
    .select("view_count")
    .eq("slug", slug)
    .single();

  if (error) {
    return null;
  }

  return (
    <div className="text-sm text-muted" style={{ flex: "0 0 auto" }}>
      {data.view_count} Views
    </div>
  );
}

const ViewCount = memo(ViewCountElement);

export default ViewCount;

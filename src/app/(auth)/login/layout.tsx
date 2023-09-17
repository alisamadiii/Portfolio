import React, { ReactNode } from "react";
import { cookies } from "next/headers";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = { children: ReactNode };

export default function Template({ children }: Props) {
  const supabase = createServerComponentClient({ cookies });

  return <div>{children}</div>;
}

// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  "1": {
    name: "1",
    component: dynamic(() => import("@/preview/1.tsx"), { ssr: false }),
  },
};

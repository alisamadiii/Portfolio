// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  button: {
    name: "button",
    component: dynamic(() => import("@/preview/button.tsx"), { ssr: false }),
  },
};

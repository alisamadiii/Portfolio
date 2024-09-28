// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  "1": {
    name: "1",
    component: dynamic(() => import("@/preview/1.tsx"), { ssr: false }),
  },
  "10": {
    name: "10",
    component: dynamic(() => import("@/preview/10.tsx"), { ssr: false }),
  },
  "11": {
    name: "11",
    component: dynamic(() => import("@/preview/11.tsx"), { ssr: false }),
  },
  "12": {
    name: "12",
    component: dynamic(() => import("@/preview/12.tsx"), { ssr: false }),
  },
  "2": {
    name: "2",
    component: dynamic(() => import("@/preview/2.tsx"), { ssr: false }),
  },
  "3": {
    name: "3",
    component: dynamic(() => import("@/preview/3.tsx"), { ssr: false }),
  },
  "4": {
    name: "4",
    component: dynamic(() => import("@/preview/4.tsx"), { ssr: false }),
  },
  "5": {
    name: "5",
    component: dynamic(() => import("@/preview/5.tsx"), { ssr: false }),
  },
  "6": {
    name: "6",
    component: dynamic(() => import("@/preview/6.tsx"), { ssr: false }),
  },
  "7": {
    name: "7",
    component: dynamic(() => import("@/preview/7.tsx"), { ssr: false }),
  },
  "8": {
    name: "8",
    component: dynamic(() => import("@/preview/8.tsx"), { ssr: false }),
  },
  "9": {
    name: "9",
    component: dynamic(() => import("@/preview/9.tsx"), { ssr: false }),
  },
};

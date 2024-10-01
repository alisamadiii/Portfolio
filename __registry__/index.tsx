// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  "twitter-contents-1": {
    name: "twitter-contents-1",
    component: dynamic(() => import("@/preview/twitter-contents/1.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-2": {
    name: "twitter-contents-2",
    component: dynamic(() => import("@/preview/twitter-contents/2.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-3": {
    name: "twitter-contents-3",
    component: dynamic(() => import("@/preview/twitter-contents/3.tsx"), {
      ssr: false,
    }),
  },
  "works-1": {
    name: "works-1",
    component: dynamic(() => import("@/preview/works/1.tsx"), { ssr: false }),
  },
  "works-10": {
    name: "works-10",
    component: dynamic(() => import("@/preview/works/10.tsx"), { ssr: false }),
  },
  "works-11": {
    name: "works-11",
    component: dynamic(() => import("@/preview/works/11.tsx"), { ssr: false }),
  },
  "works-12": {
    name: "works-12",
    component: dynamic(() => import("@/preview/works/12.tsx"), { ssr: false }),
  },
  "works-2": {
    name: "works-2",
    component: dynamic(() => import("@/preview/works/2.tsx"), { ssr: false }),
  },
  "works-3": {
    name: "works-3",
    component: dynamic(() => import("@/preview/works/3.tsx"), { ssr: false }),
  },
  "works-4": {
    name: "works-4",
    component: dynamic(() => import("@/preview/works/4.tsx"), { ssr: false }),
  },
  "works-5": {
    name: "works-5",
    component: dynamic(() => import("@/preview/works/5.tsx"), { ssr: false }),
  },
  "works-6": {
    name: "works-6",
    component: dynamic(() => import("@/preview/works/6.tsx"), { ssr: false }),
  },
  "works-7": {
    name: "works-7",
    component: dynamic(() => import("@/preview/works/7.tsx"), { ssr: false }),
  },
  "works-8": {
    name: "works-8",
    component: dynamic(() => import("@/preview/works/8.tsx"), { ssr: false }),
  },
  "works-9": {
    name: "works-9",
    component: dynamic(() => import("@/preview/works/9.tsx"), { ssr: false }),
  },
  "works-helping": {
    name: "works-helping",
    component: dynamic(() => import("@/preview/works/helping.tsx"), {
      ssr: false,
    }),
  },
};

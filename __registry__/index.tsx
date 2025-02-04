// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  "build-fast-hotKeys": {
    name: "build-fast-hotKeys",
    component: dynamic(() => import("@/preview/build-fast/hotKeys.tsx"), {
      ssr: false,
    }),
  },
  "build-fast-input-otp": {
    name: "build-fast-input-otp",
    component: dynamic(() => import("@/preview/build-fast/input-otp.tsx"), {
      ssr: false,
    }),
  },
  "build-fast-react-pdf": {
    name: "build-fast-react-pdf",
    component: dynamic(() => import("@/preview/build-fast/react-pdf.tsx"), {
      ssr: false,
    }),
  },
  "build-fast-use-click-outside": {
    name: "build-fast-use-click-outside",
    component: dynamic(
      () => import("@/preview/build-fast/use-click-outside.tsx"),
      { ssr: false }
    ),
  },
  "build-fast-use-debounced-state": {
    name: "build-fast-use-debounced-state",
    component: dynamic(
      () => import("@/preview/build-fast/use-debounced-state.tsx"),
      { ssr: false }
    ),
  },
  "build-fast-use-fullscreen": {
    name: "build-fast-use-fullscreen",
    component: dynamic(
      () => import("@/preview/build-fast/use-fullscreen.tsx"),
      { ssr: false }
    ),
  },
  "build-fast-use-media-query": {
    name: "build-fast-use-media-query",
    component: dynamic(
      () => import("@/preview/build-fast/use-media-query.tsx"),
      { ssr: false }
    ),
  },
  "build-fast-uuid": {
    name: "build-fast-uuid",
    component: dynamic(() => import("@/preview/build-fast/uuid.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-1": {
    name: "twitter-contents-1",
    component: dynamic(() => import("@/preview/twitter-contents/1.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-10": {
    name: "twitter-contents-10",
    component: dynamic(() => import("@/preview/twitter-contents/10.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-11": {
    name: "twitter-contents-11",
    component: dynamic(() => import("@/preview/twitter-contents/11.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-12": {
    name: "twitter-contents-12",
    component: dynamic(() => import("@/preview/twitter-contents/12.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-13": {
    name: "twitter-contents-13",
    component: dynamic(() => import("@/preview/twitter-contents/13.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-14": {
    name: "twitter-contents-14",
    component: dynamic(() => import("@/preview/twitter-contents/14.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-15": {
    name: "twitter-contents-15",
    component: dynamic(() => import("@/preview/twitter-contents/15.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-16": {
    name: "twitter-contents-16",
    component: dynamic(() => import("@/preview/twitter-contents/16.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-17": {
    name: "twitter-contents-17",
    component: dynamic(() => import("@/preview/twitter-contents/17.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-18": {
    name: "twitter-contents-18",
    component: dynamic(() => import("@/preview/twitter-contents/18.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-19": {
    name: "twitter-contents-19",
    component: dynamic(() => import("@/preview/twitter-contents/19.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-2": {
    name: "twitter-contents-2",
    component: dynamic(() => import("@/preview/twitter-contents/2.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-20": {
    name: "twitter-contents-20",
    component: dynamic(() => import("@/preview/twitter-contents/20.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-21": {
    name: "twitter-contents-21",
    component: dynamic(() => import("@/preview/twitter-contents/21.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-22": {
    name: "twitter-contents-22",
    component: dynamic(() => import("@/preview/twitter-contents/22.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-23": {
    name: "twitter-contents-23",
    component: dynamic(() => import("@/preview/twitter-contents/23.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-24": {
    name: "twitter-contents-24",
    component: dynamic(() => import("@/preview/twitter-contents/24.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-25": {
    name: "twitter-contents-25",
    component: dynamic(() => import("@/preview/twitter-contents/25.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-3": {
    name: "twitter-contents-3",
    component: dynamic(() => import("@/preview/twitter-contents/3.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-4": {
    name: "twitter-contents-4",
    component: dynamic(() => import("@/preview/twitter-contents/4.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-5-design-1": {
    name: "twitter-contents-5-design-1",
    component: dynamic(
      () => import("@/preview/twitter-contents/5/design-1.tsx"),
      { ssr: false }
    ),
  },
  "twitter-contents-5-design-2": {
    name: "twitter-contents-5-design-2",
    component: dynamic(
      () => import("@/preview/twitter-contents/5/design-2.tsx"),
      { ssr: false }
    ),
  },
  "twitter-contents-5": {
    name: "twitter-contents-5",
    component: dynamic(() => import("@/preview/twitter-contents/5/index.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-6-block-elements": {
    name: "twitter-contents-6-block-elements",
    component: dynamic(
      () => import("@/preview/twitter-contents/6/block-elements.tsx"),
      { ssr: false }
    ),
  },
  "twitter-contents-6-inline-elements": {
    name: "twitter-contents-6-inline-elements",
    component: dynamic(
      () => import("@/preview/twitter-contents/6/inline-elements.tsx"),
      { ssr: false }
    ),
  },
  "twitter-contents-7": {
    name: "twitter-contents-7",
    component: dynamic(() => import("@/preview/twitter-contents/7.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-8": {
    name: "twitter-contents-8",
    component: dynamic(() => import("@/preview/twitter-contents/8.tsx"), {
      ssr: false,
    }),
  },
  "twitter-contents-9": {
    name: "twitter-contents-9",
    component: dynamic(() => import("@/preview/twitter-contents/9.tsx"), {
      ssr: false,
    }),
  },
};

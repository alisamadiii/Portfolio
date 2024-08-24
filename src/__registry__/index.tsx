// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  button: {
    name: "button",
    component: dynamic(() => import("@/preview/button.tsx"), { ssr: false }),
  },
  "framer-motion-day-1": {
    name: "framer-motion-day-1",
    component: dynamic(() => import("@/preview/framer-motion/day-1.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-10": {
    name: "framer-motion-day-10",
    component: dynamic(() => import("@/preview/framer-motion/day-10.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-11": {
    name: "framer-motion-day-11",
    component: dynamic(() => import("@/preview/framer-motion/day-11.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-12-index": {
    name: "framer-motion-day-12-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-12/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-13": {
    name: "framer-motion-day-13",
    component: dynamic(() => import("@/preview/framer-motion/day-13.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-14": {
    name: "framer-motion-day-14",
    component: dynamic(() => import("@/preview/framer-motion/day-14.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-15": {
    name: "framer-motion-day-15",
    component: dynamic(() => import("@/preview/framer-motion/day-15.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-16": {
    name: "framer-motion-day-16",
    component: dynamic(() => import("@/preview/framer-motion/day-16.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-17": {
    name: "framer-motion-day-17",
    component: dynamic(() => import("@/preview/framer-motion/day-17.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-18": {
    name: "framer-motion-day-18",
    component: dynamic(() => import("@/preview/framer-motion/day-18.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-19-index": {
    name: "framer-motion-day-19-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-19/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-2": {
    name: "framer-motion-day-2",
    component: dynamic(() => import("@/preview/framer-motion/day-2.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-20": {
    name: "framer-motion-day-20",
    component: dynamic(() => import("@/preview/framer-motion/day-20.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-21": {
    name: "framer-motion-day-21",
    component: dynamic(() => import("@/preview/framer-motion/day-21.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-22-index": {
    name: "framer-motion-day-22-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-22/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-23-index": {
    name: "framer-motion-day-23-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-23/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-24-index": {
    name: "framer-motion-day-24-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-24/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-25-index": {
    name: "framer-motion-day-25-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-25/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-26-index": {
    name: "framer-motion-day-26-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-26/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-27": {
    name: "framer-motion-day-27",
    component: dynamic(() => import("@/preview/framer-motion/day-27.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-28-index": {
    name: "framer-motion-day-28-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-28/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-29": {
    name: "framer-motion-day-29",
    component: dynamic(() => import("@/preview/framer-motion/day-29.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-3-index": {
    name: "framer-motion-day-3-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-3/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-30": {
    name: "framer-motion-day-30",
    component: dynamic(() => import("@/preview/framer-motion/day-30.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-31-index": {
    name: "framer-motion-day-31-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-31/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-32-index": {
    name: "framer-motion-day-32-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-32/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-33-index": {
    name: "framer-motion-day-33-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-33/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-34-index": {
    name: "framer-motion-day-34-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-34/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-35": {
    name: "framer-motion-day-35",
    component: dynamic(() => import("@/preview/framer-motion/day-35.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-36": {
    name: "framer-motion-day-36",
    component: dynamic(() => import("@/preview/framer-motion/day-36.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-37": {
    name: "framer-motion-day-37",
    component: dynamic(() => import("@/preview/framer-motion/day-37.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-38-index": {
    name: "framer-motion-day-38-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-38/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-39-index": {
    name: "framer-motion-day-39-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-39/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-4": {
    name: "framer-motion-day-4",
    component: dynamic(() => import("@/preview/framer-motion/day-4.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-40": {
    name: "framer-motion-day-40",
    component: dynamic(() => import("@/preview/framer-motion/day-40.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-41-index": {
    name: "framer-motion-day-41-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-41/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-42-index": {
    name: "framer-motion-day-42-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-42/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-43": {
    name: "framer-motion-day-43",
    component: dynamic(() => import("@/preview/framer-motion/day-43.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-44": {
    name: "framer-motion-day-44",
    component: dynamic(() => import("@/preview/framer-motion/day-44.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-45": {
    name: "framer-motion-day-45",
    component: dynamic(() => import("@/preview/framer-motion/day-45.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-46": {
    name: "framer-motion-day-46",
    component: dynamic(() => import("@/preview/framer-motion/day-46.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-47-index": {
    name: "framer-motion-day-47-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-47/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-48-index": {
    name: "framer-motion-day-48-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-48/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-49": {
    name: "framer-motion-day-49",
    component: dynamic(() => import("@/preview/framer-motion/day-49.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-5": {
    name: "framer-motion-day-5",
    component: dynamic(() => import("@/preview/framer-motion/day-5.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-50": {
    name: "framer-motion-day-50",
    component: dynamic(() => import("@/preview/framer-motion/day-50.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-6-index": {
    name: "framer-motion-day-6-index",
    component: dynamic(
      () => import("@/preview/framer-motion/day-6/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-7": {
    name: "framer-motion-day-7",
    component: dynamic(() => import("@/preview/framer-motion/day-7.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-8": {
    name: "framer-motion-day-8",
    component: dynamic(() => import("@/preview/framer-motion/day-8.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-day-9": {
    name: "framer-motion-day-9",
    component: dynamic(() => import("@/preview/framer-motion/day-9.tsx"), {
      ssr: false,
    }),
  },
  "framer-motion-helping-others-index": {
    name: "framer-motion-helping-others-index",
    component: dynamic(
      () => import("@/preview/framer-motion/helping-others/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-intro": {
    name: "framer-motion-intro",
    component: dynamic(() => import("@/preview/framer-motion/intro.tsx"), {
      ssr: false,
    }),
  },
};

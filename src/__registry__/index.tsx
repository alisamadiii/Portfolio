// @ts-nocheck
import * as React from "react";

import dynamic from "next/dynamic";

export const Index: Record<string, any> = {
  button: {
    name: "button",
    component: dynamic(() => import("@/preview/button.tsx"), { ssr: false }),
  },
  "designs-camera-control": {
    name: "designs-camera-control",
    component: dynamic(() => import("@/preview/designs/camera-control.tsx"), {
      ssr: false,
    }),
  },
  "designs-canada-airplane": {
    name: "designs-canada-airplane",
    component: dynamic(() => import("@/preview/designs/canada-airplane.tsx"), {
      ssr: false,
    }),
  },
  "designs-clip-path": {
    name: "designs-clip-path",
    component: dynamic(() => import("@/preview/designs/clip-path.tsx"), {
      ssr: false,
    }),
  },
  "designs-helping-other": {
    name: "designs-helping-other",
    component: dynamic(() => import("@/preview/designs/helping-other.tsx"), {
      ssr: false,
    }),
  },
  "designs-stripe-select-button": {
    name: "designs-stripe-select-button",
    component: dynamic(
      () => import("@/preview/designs/stripe-select-button.tsx"),
      { ssr: false }
    ),
  },
  "designs-travel-shots": {
    name: "designs-travel-shots",
    component: dynamic(() => import("@/preview/designs/travel-shots.tsx"), {
      ssr: false,
    }),
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
  "framer-motion-day-12": {
    name: "framer-motion-day-12",
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
  "framer-motion-day-19": {
    name: "framer-motion-day-19",
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
  "framer-motion-day-22": {
    name: "framer-motion-day-22",
    component: dynamic(
      () => import("@/preview/framer-motion/day-22/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-23": {
    name: "framer-motion-day-23",
    component: dynamic(
      () => import("@/preview/framer-motion/day-23/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-24": {
    name: "framer-motion-day-24",
    component: dynamic(
      () => import("@/preview/framer-motion/day-24/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-25": {
    name: "framer-motion-day-25",
    component: dynamic(
      () => import("@/preview/framer-motion/day-25/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-26": {
    name: "framer-motion-day-26",
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
  "framer-motion-day-28": {
    name: "framer-motion-day-28",
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
  "framer-motion-day-3": {
    name: "framer-motion-day-3",
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
  "framer-motion-day-31": {
    name: "framer-motion-day-31",
    component: dynamic(
      () => import("@/preview/framer-motion/day-31/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-32": {
    name: "framer-motion-day-32",
    component: dynamic(
      () => import("@/preview/framer-motion/day-32/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-33": {
    name: "framer-motion-day-33",
    component: dynamic(
      () => import("@/preview/framer-motion/day-33/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-34": {
    name: "framer-motion-day-34",
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
  "framer-motion-day-38": {
    name: "framer-motion-day-38",
    component: dynamic(
      () => import("@/preview/framer-motion/day-38/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-39": {
    name: "framer-motion-day-39",
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
  "framer-motion-day-41": {
    name: "framer-motion-day-41",
    component: dynamic(
      () => import("@/preview/framer-motion/day-41/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-42": {
    name: "framer-motion-day-42",
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
  "framer-motion-day-47": {
    name: "framer-motion-day-47",
    component: dynamic(
      () => import("@/preview/framer-motion/day-47/index.tsx"),
      { ssr: false }
    ),
  },
  "framer-motion-day-48": {
    name: "framer-motion-day-48",
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
  "framer-motion-day-6": {
    name: "framer-motion-day-6",
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
  "framer-motion-helping-others": {
    name: "framer-motion-helping-others",
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
  "ui-dropdown": {
    name: "ui-dropdown",
    component: dynamic(() => import("@/preview/ui/dropdown.tsx"), {
      ssr: false,
    }),
  },
  "ui-fade-scroll-content": {
    name: "ui-fade-scroll-content",
    component: dynamic(() => import("@/preview/ui/fade-scroll-content.tsx"), {
      ssr: false,
    }),
  },
};

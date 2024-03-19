"use client";

import * as React from "react";

export const Index: Array<{ name: string; component: any }> = [
  {
    name: "drag-profiles-picture",
    component: React.lazy(() => import("./drag-profiles-picture")),
  },
  {
    name: "expand-profiles-picture",
    component: React.lazy(() => import("./expand-profiles-picture")),
  },
  {
    name: "password",
    component: React.lazy(() => import("./password")),
  },
  {
    name: "loading",
    component: React.lazy(() => import("./loading")),
  },
  {
    name: "number-animation",
    component: React.lazy(() => import("./number-animation")),
  },
  {
    name: "button-height",
    component: React.lazy(() => import("./button-height")),
  },
  {
    name: "blur-text",
    component: React.lazy(() => import("./blur-text")),
  },
  {
    name: "textarea-tagging",
    component: React.lazy(() => import("./textarea-tagging")),
  },
  {
    name: "two-factor-authentication",
    component: React.lazy(() => import("./two-factor-authentication")),
  },
  {
    name: "generate-metadata",
    component: React.lazy(() => import("./generate-metadata")),
  },
  {
    name: "video",
    component: React.lazy(() => import("./video")),
  },
  {
    name: "tech-hover-animation",
    component: React.lazy(() => import("./tech-hover-animation")),
  },
  {
    name: "photos-expand",
    component: React.lazy(() => import("./photos-expand")),
  },
  {
    name: "gradient-animation",
    component: React.lazy(() => import("./gradient-animation")),
  },
];

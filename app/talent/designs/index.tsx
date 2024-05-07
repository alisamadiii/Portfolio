import * as React from "react";

export interface ComponentInfo {
  id: number;
  name: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  from?: {
    creator: string;
    link: string;
  };
}

export type CollectionsTypes = Array<"general" | "animations-dev">;

export interface IndexData {
  general: ComponentInfo[];
  "animations-dev": ComponentInfo[];
}

export const NewIndex: IndexData = {
  general: [
    {
      id: 1,
      name: "blurry-input",
      component: React.lazy(() => import("./blurry-input")),
    },
    {
      id: 2,
      name: "drag-profiles-picture",
      component: React.lazy(() => import("./drag-profiles-picture")),
    },
    {
      id: 3,
      name: "expand-profiles-picture",
      component: React.lazy(() => import("./expand-profiles-picture")),
    },
    {
      id: 4,
      name: "password",
      component: React.lazy(() => import("./password")),
    },
    {
      id: 5,
      name: "loading",
      component: React.lazy(() => import("./loading")),
    },
    {
      id: 6,
      name: "number-animation",
      component: React.lazy(() => import("./number-animation")),
    },
    {
      id: 7,
      name: "button-height",
      component: React.lazy(() => import("./button-height")),
    },
    {
      id: 8,
      name: "blur-text",
      component: React.lazy(() => import("./blur-text")),
    },
    {
      id: 9,
      name: "textarea-tagging",
      component: React.lazy(() => import("./textarea-tagging")),
    },
    {
      id: 10,
      name: "two-factor-authentication",
      component: React.lazy(() => import("./two-factor-authentication")),
    },
    // {
    //   id: 11,
    //   name: "generate-metadata",
    //   component: React.lazy(() => import("./generate-metadata")),
    // },
    {
      id: 12,
      name: "video",
      component: React.lazy(() => import("./video")),
    },
    {
      id: 13,
      name: "tech-hover-animation",
      component: React.lazy(() => import("./tech-hover-animation")),
    },
    {
      id: 14,
      name: "photos-expand",
      component: React.lazy(() => import("./photos-expand")),
    },
    {
      id: 15,
      name: "gradient-animation",
      component: React.lazy(() => import("./gradient-animation")),
    },
    {
      id: 16,
      name: "feedback",
      component: React.lazy(() => import("./feedback")),
    },
    {
      id: 16,
      name: "Theme-Toggle",
      component: React.lazy(() => import("./theme-toggle")),
      from: {
        creator: "Татьяна Крупина",
        link: "https://www.figma.com/community/file/1052592425974607958/toggle-switch-free-can-edit",
      },
    },
  ],
  "animations-dev": [
    {
      id: 17,
      name: "form-popover",
      component: React.lazy(() => import("./form-popover")),
    },
    {
      id: 18,
      name: "practice",
      component: React.lazy(() => import("./practice")),
    },
  ],
};

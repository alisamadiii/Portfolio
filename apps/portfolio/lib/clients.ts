import type { ComponentType } from "react";

import { CrosspostWordmark } from "@/components/icons/clients";

export type ClientVideo = {
  /** CDN MP4 URL */
  src: string;
  /** portrait 9:16 tile instead of landscape 16:9 */
  isPhone?: boolean;
  /** optional thumbnail URL */
  poster?: string;
};

export type ClientProject = {
  slug: string;
  name: string;
  logo: ComponentType<{ className?: string }>;
  videos: ClientVideo[];
};

export const clientProjects: ClientProject[] = [
  {
    slug: "crosspost",
    name: "Crosspost",
    logo: CrosspostWordmark,
    // src left empty until CDN URLs are ready — comments map to the old Cloudflare Stream IDs
    videos: [
      { src: "", isPhone: true }, // 721cd08eefc195d28c53b83f4256fe41 (onboarding)
      { src: "", isPhone: true }, // 31ad10a04da4988837ae49aa78ad389d (onboarding)
      { src: "" }, // 2b91b502e45d28c10ba02c6b1b755e4d (onboarding)
      { src: "", isPhone: true }, // ea63a5e0fa80f30658f145b1bcf55e25 (auth)
      { src: "", isPhone: true }, // 051a86b4d295925e2dae1d3760982cfa (auth)
      { src: "", isPhone: true }, // 23922272b368b10909a436cf8eece2be (auth)
      { src: "", isPhone: true }, // 49bbda729f2eba91bfa6e08d50113bae (auth)
      { src: "" }, // 18666ee9dea8eee18c71053f0c99bb0b (full account creation)
      { src: "", isPhone: true }, // 60be82b7147ff9baab85ab96286e7d95 (platform views)
      { src: "" }, // 2f25a0bde38ab28acf817e8cb94d4eee (platform views)
      { src: "", isPhone: true }, // 5e580ef5fb295a41a2d0782603f2f48f (pricing)
      { src: "", isPhone: true }, // 4a33924c6c299e380a580629440e0f21 (settings)
      { src: "", isPhone: true }, // 93f6ba0b8731619d44e9e19a43134e3c (settings)
      { src: "", isPhone: true }, // af9b378447ce01503be7e33226d1fbdf (settings)
      { src: "", isPhone: true }, // 8839d57490f267950b070d3a02f77830 (profiles)
      { src: "", isPhone: true }, // 6a4dadb09980bc36ca2d7bb1c0b76781 (profiles)
      { src: "", isPhone: true }, // 603cbb8ad33806cb40327435e0c5bf66 (feeds)
      { src: "", isPhone: true }, // 15c481feb30e47fb84fe7ae4134d7955 (feeds)
    ],
  },
];

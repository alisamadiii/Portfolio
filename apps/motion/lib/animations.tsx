import dynamic from "next/dynamic";

import { AnimationLoading } from "../components/animation-loading";

export const animations: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    component: React.ComponentType;
    image: string;
    darkImage?: string;
    isPremium?: boolean;
  }
> = {
  "ios-card": {
    id: "0ae1e574-9473-4bc2-9354-c53d6931af57",
    name: "IosCard",
    description:
      "IosCard is a component that displays a card with a phone mockup",
    component: dynamic(() => import("@/animations/ios-card"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/616eeb39-dd5a-4735-bb93-686dc6eb4835",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/e17a3b89-46ce-49fb-b998-8c673ac92113",
    isPremium: false,
  },
  "lume-city-selector": {
    id: "e4222471-86e4-4d0e-adee-65029cd0f6d3",
    name: "LumeCitySelector",
    description:
      "LumeCitySelector is a component that displays a city selector with a phone mockup",
    component: dynamic(() => import("@/animations/lume-city-selector"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
};

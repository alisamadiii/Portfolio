import dynamic from "next/dynamic";

export const animations = {
  "ios-card": {
    id: "0ae1e574-9473-4bc2-9354-c53d6931af57",
    name: "IosCard",
    description:
      "IosCard is a component that displays a card with a phone mockup",
    component: dynamic(() => import("@/animations/ios-card"), { ssr: false }),
  },
  "lume-city-selector": {
    id: "e4222471-86e4-4d0e-adee-65029cd0f6d3",
    name: "LumeCitySelector",
    description:
      "LumeCitySelector is a component that displays a city selector with a phone mockup",
    component: dynamic(() => import("@/animations/lume-city-selector"), {
      ssr: false,
    }),
  },
};

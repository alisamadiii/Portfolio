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
  "telegram-reply": {
    id: "6ee1ae3a-6aa8-4c73-9574-69235d6ac18c",
    name: "TelegramReply",
    description:
      "TelegramReply is a component that displays a telegram reply with a phone mockup",
    component: dynamic(() => import("@/animations/telegram-reply"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/9d5e8490-50ad-45c4-b771-e2280d5c8afa",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/edd8d6c9-7ebd-4953-b592-31cf5b496502",
    isPremium: true,
  },
  "stripe-grid": {
    id: "stripe-grid",
    name: "StripeGrid",
    description: "StripeGrid is a component that displays a stripe grid",
    component: dynamic(() => import("@/animations/stripe-grid"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "pin-items": {
    id: "pin-items",
    name: "PinItems",
    description: "PinItems is a component that displays a pin items",
    component: dynamic(() => import("@/animations/pin-items"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "send-money": {
    id: "send-money",
    name: "SendMoney",
    description: "SendMoney is a component that displays a send money",
    component: dynamic(() => import("@/animations/send-money"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "checkbox-and-submit": {
    id: "checkbox-and-submit",
    name: "CheckboxAndSubmit",
    description:
      "CheckboxAndSubmit is a component that displays a checkbox and submit",
    component: dynamic(() => import("@/animations/checkbox-and-submit"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "profile-telegram": {
    id: "profile-telegram",
    name: "ProfileTelegram",
    description:
      "ProfileTelegram is a component that displays a profile telegram",
    component: dynamic(() => import("@/animations/profile-telegram"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "faq-spring": {
    id: "faq-spring",
    name: "FaqSpring",
    description: "FaqSpring is a component that displays a faq spring",
    component: dynamic(() => import("@/animations/faq-spring"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "input-stack": {
    id: "input-stack",
    name: "InputStack",
    description: "InputStack is a component that displays a input stack",
    component: dynamic(() => import("@/animations/input-stack"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "calender-text-spring": {
    id: "calender-text-spring",
    name: "CalenderTextSpring",
    description:
      "CalenderTextSpring is a component that displays a calender text spring",
    component: dynamic(() => import("@/animations/calender-text-spring"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "drag-down-list": {
    id: "drag-down-list",
    name: "DragDownList",
    description: "DragDownList is a component that displays a drag down list",
    component: dynamic(() => import("@/animations/drag-down-list"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "dots-animation": {
    id: "dots-animation",
    name: "DotsAnimation",
    description: "DotsAnimation is a component that displays a dots animation",
    component: dynamic(() => import("@/animations/dots-animation"), {
      ssr: false,
      loading: AnimationLoading,
    }),
    image:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/6c04be63-b8d7-4496-b755-18d5f54e5718",
    darkImage:
      "https://alisamadii-llc.s3.us-west-2.amazonaws.com/public/a916f3e6-86b9-491b-8842-9245544f62b0",
    isPremium: true,
  },
  "slack-profile-view": {
    id: "slack-profile-view",
    name: "SlackProfileView",
    description:
      "SlackProfileView is a component that displays a slack profile view",
    component: dynamic(() => import("@/animations/slack-profile-view"), {
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

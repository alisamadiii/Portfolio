import { Variants } from "framer-motion";

const ServicePopupAnimation: Variants = {
  hidden: {
    rotateX: "var(--rotateX-from, 0)",
    scale: "var(--scale-from, 1)",
    y: "var(--y-from, 0px)",
    opacity: "var(--opacity-from, 1)",
    height: "var(--height-from)",
  },
  visible: {
    rotateX: "var(--rotateX-to, 0)",
    scale: "var(--scale-to, 1)",
    opacity: "var(--opacity-to, 1)",
    height: "var(--height-to)",
  },
  exit: {
    rotateX: "var(--rotateX-from, 0)",
    scale: "var(--scale-from, 1)",
    y: "var(--y-from, 0px)",
    opacity: "var(--opacity-from, 1)",
    height: "var(--height-from)",
  },
};

export { ServicePopupAnimation };

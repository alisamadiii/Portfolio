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

const UserInformationPopup: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 24,
  },
};

const ProjectInformation: Variants = {
  hidden: {
    height: 0,
  },
  visible: {
    height: "auto",
  },
  exit: {
    height: 0,
  },
};

export { ServicePopupAnimation, UserInformationPopup, ProjectInformation };

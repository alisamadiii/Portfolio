import { Variant, Variants } from "framer-motion";

interface FramerMotionType extends Variants {
  hidden: Variant;
  visible: Variant;
  exit: Variant;
}

type TechIcon =
  | "html"
  | "css"
  | "js"
  | "tailwind"
  | "reactjs"
  | "nextjs"
  | "supabase";

interface TechnologyType {
  id: number;
  title: string;
  icon: TechIcon;
  description: string;
}

export type { FramerMotionType, TechIcon, TechnologyType };

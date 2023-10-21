import { type Variant, type Variants } from "framer-motion";

interface FramerMotionType extends Variants {
  hidden: Variant;
  visible: Variant;
  exit: Variant;
}

interface FileUploaded {
  lastModified: number;
  lastModifiedDate: string;
  name: string;
  size: number;
  type: string;
  webkitRelativePath: string;
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

export type { FramerMotionType, FileUploaded, TechIcon, TechnologyType };

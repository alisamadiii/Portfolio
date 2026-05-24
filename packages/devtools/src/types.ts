export interface DevToolsProps {
  storageKey?: string;
  position?: "bottom-right" | "bottom-left";
  zIndex?: number;
  requestUrl?: string;
}

export type DevToolsState =
  | "hidden"
  | "idle"
  | "inspecting"
  | "editing"
  | "viewing";

export interface Change {
  id: string;
  selector: string;
  element: string;
  type: "text" | "image";
  original: string;
  modified: string;
  note: string;
}

export interface FeedbackPayload {
  url: string;
  path: string;
  changes: Change[];
  timestamp: string;
}

export interface PersistedFeedback {
  changes: Change[];
}

export interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ElementMeta {
  selector: string;
  tag: string;
  classes: string[];
  id: string | null;
  textContent: string;
  dataAttributes: Record<string, string>;
  isImage: boolean;
  imageSrc: string | null;
}

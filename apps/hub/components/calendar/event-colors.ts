"use client";

import { useCallback, useSyncExternalStore } from "react";

// Per-browser event colors for the Calendar page: right-click an event, pick
// a color, and every event with exactly that title uses it. Saved only in
// this browser's localStorage, never sent to Google or the hub.

const KEY = "hub:calendar:event-colors";

/** Google Calendar's own event palette, then extra hues and neutrals. */
export const EVENT_COLORS = [
  { name: "Tomato", hex: "#d50000" },
  { name: "Flamingo", hex: "#e67c73" },
  { name: "Tangerine", hex: "#f4511e" },
  { name: "Banana", hex: "#f6bf26" },
  { name: "Sage", hex: "#33b679" },
  { name: "Basil", hex: "#0b8043" },
  { name: "Peacock", hex: "#039be5" },
  { name: "Blueberry", hex: "#3f51b5" },
  { name: "Lavender", hex: "#7986cb" },
  { name: "Grape", hex: "#8e24aa" },
  { name: "Graphite", hex: "#616161" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Pink", hex: "#db2777" },
  { name: "Fuchsia", hex: "#c026d3" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Sky", hex: "#0284c7" },
  { name: "Cyan", hex: "#0891b2" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Emerald", hex: "#059669" },
  { name: "Lime", hex: "#65a30d" },
  { name: "Amber", hex: "#d97706" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Brown", hex: "#8d6e63" },
  { name: "Slate", hex: "#475569" },
  { name: "Coral", hex: "#fc8464" },
  { name: "Black", hex: "#1f1f1f" },
] as const;

type ColorMap = Record<string, string>;

const listeners = new Set<() => void>();
let cache: ColorMap | null = null;
const EMPTY: ColorMap = {};

function read(): ColorMap {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    cache = parsed && typeof parsed === "object" ? (parsed as ColorMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: ColorMap) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / blocked storage: the color still applies this session.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab changed the colors.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saved colors keyed by exact event title, plus a setter (null = reset). */
export function useEventColors() {
  const colors = useSyncExternalStore(subscribe, read, () => EMPTY);
  const setColor = useCallback((title: string, hex: string | null) => {
    const next = { ...read() };
    if (hex) next[title] = hex;
    else delete next[title];
    write(next);
  }, []);
  return { colors, setColor };
}

/** The same hue, darkened, for text on the tinted fill. */
export function darken(hex: string, amount = 0.45) {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

import { useEffect, useRef } from "react";

export function useScramble(text: string) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let iter = 0;

    const iv = setInterval(() => {
      el.textContent = text
        .split("")
        .map((c, i) => {
          if (c === "\n") return "\n";
          if (c === " ") return " ";
          if (i < iter) return c;
          return pool[Math.floor(Math.random() * pool.length)];
        })
        .join("");
      iter += 1;
      if (iter > text.length) {
        clearInterval(iv);
        el.textContent = text;
      }
    }, 30);

    return () => clearInterval(iv);
  }, [text]);

  return ref;
}

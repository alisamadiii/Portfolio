"use client";

import { useEffect, useRef } from "react";

export const TerminalPanel = ({
  output,
}: {
  output: string[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-zinc-950 p-3 font-mono text-xs text-zinc-400"
    >
      {output.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap leading-5">
          {line}
        </div>
      ))}
    </div>
  );
};

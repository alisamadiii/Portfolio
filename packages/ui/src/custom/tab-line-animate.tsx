import { useEffect, useRef, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";

import { cn } from "../lib/utils";

interface TabLineAnimateProps {
  tabs: { label: string; value: string }[];
  className?: string;
  tab?: string;
  setTab?: (tab: string) => void;
}

export const TabLineAnimate = ({
  tabs,
  className,
  tab,
  setTab,
}: TabLineAnimateProps) => {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault(tabs[0]?.value ?? "")
  );

  const active = tab || activeTab;
  const setActive = setTab || setActiveTab;

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lineStyle, setLineStyle] = useState<{
    width: number;
    translateX: number;
  }>({ width: 0, translateX: 0 });

  useEffect(() => {
    const activeButton = buttonRefs.current[active];
    const container = containerRef.current;

    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setLineStyle({
        width: buttonRect.width,
        translateX: buttonRect.left - containerRect.left,
      });
    }
  }, [active, tabs]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex gap-5 border-b", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          ref={(el) => {
            buttonRefs.current[tab.value] = el;
          }}
          className={cn(
            "text-muted-foreground hover:text-foreground relative py-2 text-sm transition-colors active:translate-y-[.5px]",
            active === tab.value && "text-foreground"
          )}
          onClick={() => setActive(tab.value)}
        >
          {tab.label}
        </button>
      ))}
      <span
        className="bg-foreground absolute bottom-0 left-0 h-0.5 transition-all duration-200 ease-in-out"
        style={{
          width: `${lineStyle.width}px`,
          transform: `translateX(${lineStyle.translateX}px)`,
        }}
      />
    </div>
  );
};

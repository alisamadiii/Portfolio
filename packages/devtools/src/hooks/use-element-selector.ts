import { useCallback, useEffect, useState } from "react";

import type { ElementRect } from "../types";
import { getElementLabel, isDevToolsElement } from "../utils/element-info";

export function useElementSelector(active: boolean) {
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [label, setLabel] = useState("");
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
  }, []);

  useEffect(() => {
    if (!active) {
      setHoveredElement(null);
      setRect(null);
      setLabel("");
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Don't highlight when hovering devtools UI
      if (isDevToolsElement(e.target as Element)) {
        setHoveredElement(null);
        setRect(null);
        setLabel("");
        return;
      }

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const target = elements.find((el) => !isDevToolsElement(el));

      if (
        !target ||
        target === document.body ||
        target === document.documentElement
      ) {
        setHoveredElement(null);
        setRect(null);
        setLabel("");
        return;
      }

      setHoveredElement(target);
      const bounds = target.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      });
      setLabel(getElementLabel(target));
    };

    const handleClick = (e: MouseEvent) => {
      // Don't intercept clicks on devtools UI
      if (isDevToolsElement(e.target as Element)) return;

      e.preventDefault();
      e.stopPropagation();

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const target = elements.find((el) => !isDevToolsElement(el));

      if (
        target &&
        target !== document.body &&
        target !== document.documentElement
      ) {
        setSelectedElement(target);
      }
    };

    const handleScroll = () => {
      if (hoveredElement) {
        const bounds = hoveredElement.getBoundingClientRect();
        setRect({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [active, hoveredElement]);

  return { hoveredElement, rect, label, selectedElement, clearSelection };
}

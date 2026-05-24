import { useCallback, useEffect, useRef } from "react";

import type { Change } from "../types";
import { getCssSelector, getElementLabel } from "../utils/element-info";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface EditorProps {
  element: Element;
  onTrackOriginal: (
    element: Element,
    type: "text" | "image",
    value: string
  ) => void;
  onAddChange: (change: Change) => void;
}

export function Editor({ element, onTrackOriginal, onAddChange }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const changeIdRef = useRef(generateId());

  const isImage = element.tagName.toLowerCase() === "img";
  const htmlEl = element as HTMLElement;

  const setupTextEditing = useCallback(() => {
    if (isImage) return;

    const originalText = htmlEl.textContent || "";
    onTrackOriginal(element, "text", originalText);

    htmlEl.contentEditable = "true";
    htmlEl.style.outline = "2px solid rgba(59, 130, 246, 0.5)";
    htmlEl.style.outlineOffset = "2px";
    htmlEl.style.cursor = "text";

    htmlEl.focus();

    const handleInput = () => {
      const newText = htmlEl.textContent || "";
      if (newText !== originalText) {
        onAddChange({
          id: changeIdRef.current,
          selector: getCssSelector(element),
          element: getElementLabel(element),
          type: "text",
          original: originalText,
          modified: newText,
          note: "",
        });
      }
    };

    htmlEl.addEventListener("input", handleInput);
    return () => {
      htmlEl.removeEventListener("input", handleInput);
    };
  }, [element, htmlEl, isImage, onTrackOriginal, onAddChange]);

  const setupImageEditing = useCallback(() => {
    if (!isImage) return;

    const imgEl = element as HTMLImageElement;
    const originalSrc = imgEl.src;
    onTrackOriginal(element, "image", originalSrc);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    fileInputRef.current = input;

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-devtools-ignore", "");
    wrapper.style.cssText = `
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      border-radius: 4px;
      cursor: pointer;
      z-index: 99998;
    `;

    const updatePosition = () => {
      const rect = imgEl.getBoundingClientRect();
      wrapper.style.top = `${rect.top + window.scrollY}px`;
      wrapper.style.left = `${rect.left + window.scrollX}px`;
      wrapper.style.width = `${rect.width}px`;
      wrapper.style.height = `${rect.height}px`;
    };
    updatePosition();

    const btn = document.createElement("button");
    btn.textContent = "Replace Image";
    btn.setAttribute("data-devtools-ignore", "");
    btn.style.cssText = `
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);

    btn.addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        imgEl.src = dataUrl;
        onAddChange({
          id: changeIdRef.current,
          selector: getCssSelector(element),
          element: getElementLabel(element),
          type: "image",
          original: originalSrc,
          modified: `[replaced with ${file.name}]`,
          note: "",
        });
        wrapper.remove();
      };
      reader.readAsDataURL(file);
    });

    return () => {
      wrapper.remove();
      input.remove();
    };
  }, [element, isImage, onTrackOriginal, onAddChange]);

  useEffect(() => {
    const cleanupText = setupTextEditing();
    const cleanupImage = setupImageEditing();

    return () => {
      cleanupText?.();
      cleanupImage?.();
    };
  }, [setupTextEditing, setupImageEditing]);

  return null;
}

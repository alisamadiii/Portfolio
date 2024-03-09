import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";

export default function Textarea() {
  const [value, setValue] = useState("");
  const [color, setColor] = useState("#4169E1");

  const [ref, { height }] = useMeasure();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onChangeHandler = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
  };

  // Expanding
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "48px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div className="w-full max-w-md">
      <motion.div
        animate={{ height: height > 0 ? height : undefined }}
        transition={{ duration: 0.1 }}
        className="w-full border-b focus-within:border-gray-400"
      >
        <div ref={ref} className="relative">
          <p
            className={`pointer-events-none absolute left-0 top-0 whitespace-pre-line p-1`}
          >
            {value
              .split(/(@\w+)/g)
              .map((text, index) =>
                text.startsWith("@") ? (
                  <HighlightedWord key={index} text={text} color={color} />
                ) : (
                  text
                )
              )}
          </p>
          <textarea
            ref={textareaRef}
            name="tagging"
            id="tagging"
            placeholder="caption"
            className="custom-selection h-full w-full resize-none overflow-hidden bg-transparent p-1 text-white caret-black outline-none transition-colors"
            onChange={onChangeHandler}
          />
        </div>
      </motion.div>

      <div className="z-20 mt-8 flex justify-center gap-2">
        {["#4169E1", "#2ECC71", "#FF6F61", "#FFD700", "#DA70D6", "#008080"].map(
          (value, index) => (
            <button
              key={index}
              onClick={() => setColor(value)}
              className="h-4 w-4 rounded-full duration-200"
              style={{
                background: value,
                boxShadow:
                  value === color
                    ? `0 0 0 2px white, 0 0 0 4px ${value}`
                    : undefined,
              }}
            ></button>
          )
        )}
      </div>
    </div>
  );
}

function HighlightedWord({ text, color }: { text: string; color: string }) {
  const [isShow, setIsShow] = useState(true);

  const highlightWord = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.key === " " || event.key === "Enter") && isShow) {
        setIsShow(false);
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isShow]);

  useOnClickOutside(highlightWord, () => setIsShow(false));

  return (
    <div ref={highlightWord} className="relative inline-block">
      <span
        className="pointer-events-auto cursor-pointer duration-200"
        style={{ color }}
        onClick={() => setIsShow(!isShow)}
      >
        {text}
      </span>
      <AnimatePresence>
        {isShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0, x: "-50%", y: 32 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-0 z-10 flex h-48 w-48 origin-top flex-col items-center justify-center rounded-xl border bg-gray-200/60 text-sm text-gray-700 shadow-2xl backdrop-blur-md"
          >
            <span>Add your content here</span>
            <small className="inline-block w-full truncate px-2 text-center">
              {text}
            </small>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

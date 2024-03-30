import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import useMeasure from "react-use-measure";
import { motion } from "framer-motion";

export default function Feedback() {
  const [input, setInput] = useState("");
  const [isSubmit, setIsSubmit] = useState(false);

  const [ref, { height }] = useMeasure();

  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

  const onSubmitHandler = (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (input.length > 0) {
      setIsSubmit(true);
      setInput("");
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "80px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  return (
    <motion.div
      animate={{ height: height > 0 ? height : undefined }}
      className="w-full max-w-2xl overflow-hidden rounded-xl border"
    >
      <form ref={ref} onSubmit={onSubmitHandler} className="p-4">
        <h1 className="mb-1 text-4xl font-bold">Feedbacks</h1>
        <p className="text-muted">
          We&apos;d be happy to hear your experience about our website.
        </p>
        {!isSubmit ? (
          <>
            <textarea
              ref={textareaRef}
              name=""
              id=""
              className="mt-4 h-[80px] max-h-[200px] w-full resize-none rounded-md border p-2 caret-black outline-none focus:border-black"
              placeholder="say something..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            ></textarea>
            <button className="mt-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-opacity-80">
              Submit
            </button>
          </>
        ) : (
          <div className="flex h-24 flex-col items-center justify-center">
            <h2 className="text-xl">✅ Submitted</h2>
            <button className="underline" onClick={() => setIsSubmit(false)}>
              another one
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
}

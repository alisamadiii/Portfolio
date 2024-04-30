"use client";

import React, { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

export default function FeedbackComponentCSS() {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState("idle");
  const [feedback, setFeedback] = useState("");

  function submit() {
    setFormState("loading");
    setTimeout(() => {
      setFormState("success");
    }, 1500);

    setTimeout(() => {
      setOpen(false);
    }, 3300);
  }

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === "Escape") {
        setOpen(false);
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        open &&
        formState === "idle"
      ) {
        submit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formState]);

  return (
    <div
      className="flex w-full items-center justify-center"
      onClick={() => setOpen(!open)}
    >
      <motion.button
        layoutId="wrapper"
        onClick={() => {
          setOpen(true);
          setFormState("idle");
          setFeedback("");
        }}
        key="button"
        className="relative flex h-9 items-center border border-red-500 bg-white px-3 text-black active:!scale-[0.98]"
        style={{ borderRadius: 8 }}
      >
        <motion.span layoutId="title">Feedback</motion.span>
      </motion.button>
      <AnimatePresence>
        {open ? (
          <motion.div
            layoutId="wrapper"
            className="absolute h-[200px] w-[364px] overflow-hidden bg-white p-1 outline-none"
            style={{ borderRadius: 12 }}
          >
            <motion.span
              aria-hidden
              className="placeholder"
              layoutId="title"
              data-success={formState === "success" ? "true" : "false"}
              data-feedback={feedback ? "true" : "false"}
            >
              Feedback
            </motion.span>

            <form className="h-full border border-red-500"></form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

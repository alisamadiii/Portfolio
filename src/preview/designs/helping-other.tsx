"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useOnClickOutside } from "usehooks-ts";

export default function Popover() {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

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
    const handleKeyDown = (event: KeyboardEvent) => {
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

  console.log(feedback);

  return (
    <div className="font-figtree grid h-dvh w-full place-items-center bg-[#F9F5F1]">
      {/* Feedback Wrapper */}
      <div className="flex h-[500px] w-full items-center justify-center">
        {/* Initial Button */}
        <motion.button
          layoutId="wrapper"
          onClick={() => {
            setOpen(true);
            setFormState("idle");
            setFeedback("");
          }}
          className="group flex h-10 items-center gap-1 border border-[#E7E3E0] bg-white pl-3 pr-4 text-sm font-medium text-[#191716] transition-colors duration-200 ease-out hover:bg-[#B0AEAC]/5"
          key="button"
          style={{
            borderRadius: 8,
          }}
        >
          <motion.span layoutId="title" className="inline-block">
            Add note
          </motion.span>
        </motion.button>
        {/* Open Popover */}
        <AnimatePresence>
          {open ? (
            <motion.div
              layoutId="wrapper"
              className="absolute h-[210px] w-[316px] overflow-hidden border border-[#e7e3e0] bg-[#F2EDE8] p-1"
              style={{ borderRadius: 16 }}
              ref={ref}
            >
              <motion.span
                aria-hidden
                layoutId="title"
                className={`absolute left-[21px] top-[20px] inline-block text-sm font-normal text-[#191716]/30 ${feedback && "!opacity-0"}`}
                style={{ opacity: feedback ? 0 : 1 }}
              >
                Add note
              </motion.span>

              <AnimatePresence mode="popLayout">
                {formState === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ y: -40, opacity: 0, filter: "blur(5px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="-mt-1"
                    >
                      <rect
                        x="0.5"
                        y="0.5"
                        width="31"
                        height="31"
                        rx="15.5"
                        fill="#3A94FF"
                        fill-opacity="0.16"
                      />
                      <rect
                        x="0.5"
                        y="0.5"
                        width="31"
                        height="31"
                        rx="15.5"
                        stroke="#3A94FF"
                      />
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M24.2639 9.63605C24.6544 10.0266 24.6544 10.6597 24.2639 11.0503L13.6568 21.6569C13.2663 22.0474 12.6332 22.0474 12.2426 21.6569L7.29289 16.7071C6.90237 16.3166 6.90237 15.6834 7.29289 15.2929C7.68342 14.9024 8.31658 14.9024 8.70711 15.2929L12.9498 19.5355L22.8497 9.63602C23.2402 9.2455 23.8734 9.24552 24.2639 9.63605Z"
                        fill="#3A94FF"
                      />
                    </svg>
                    <h3 className="font-figtree mb-1 mt-2 text-base font-semibold text-[#191716]">
                      Note added
                    </h3>
                    <p className="font-figtree max-w-[240px] text-center text-sm font-medium text-[#B0AEAC]">
                      You can edit or delete your note from your Exercise
                      History at any time.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    exit={{ y: 8, opacity: 0, filter: "blur(4px)" }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                    key="form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!feedback) return;
                      submit();
                    }}
                    className="rounded-xl border border-[#E7E3E0] bg-white"
                  >
                    <textarea
                      autoFocus
                      placeholder="Add note"
                      onChange={(e) => setFeedback(e.target.value)}
                      className="font-figtree h-[144px] w-full resize-none rounded-t-xl rounded-tr-xl p-4 text-sm font-normal text-[#191716] outline-none placeholder:opacity-0"
                      required
                    />
                    <div className="FEEDBACK-FOOTER relative flex h-12 items-center justify-end px-2">
                      {/* <span className="absolute left-0 top-0 -translate-x-px -translate-y-1/2">
                        <HalfCircleLeft />
                      </span>
                      <span className="absolute right-0 top-0 -translate-y-1/2 translate-x-px">
                        <HalfCircleRight />
                      </span> */}
                      <div className="absolute -top-[0.5px] left-[7px] right-[6px] h-[1px] bg-[repeating-linear-gradient(90deg,#E7E3E0,#E7E3E0_2px,transparent_2px,transparent_4px)]" />
                      <button
                        type="submit"
                        className="font-figtree flex h-8 w-24 items-center justify-center rounded-lg bg-[#191716] px-4 text-sm font-medium text-white"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            transition={{
                              type: "spring",
                              duration: 0.3,
                              bounce: 0,
                            }}
                            initial={{ opacity: 0, y: -25 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 25 }}
                            key={formState}
                          >
                            {formState === "loading" ? (
                              <span>loading...</span>
                            ) : (
                              <span>Save note</span>
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

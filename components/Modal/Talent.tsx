import React, { useState } from "react";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { GrUserWorker } from "react-icons/gr";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Talent() {
  const [show, setShow] = useState(false);

  const [scope, animateNow] = useAnimate();

  const onClickHandler = () => {
    setShow(true);
  };

  const onCloseHandler = () => {
    setShow(false);
  };

  const onMouseOver = () => {
    animateNow("span", { scale: 1.1 });
  };
  const onMouseLeave = () => {
    animateNow("span", { scale: 1 });
  };

  const pathnameShow = usePathname().includes("/talent");

  return (
    <>
      <div
        className={`fixed bottom-0 right-0 z-20 p-8 ${pathnameShow ? "pointer-events-none opacity-0" : "block"}`}
      >
        <div>
          <motion.button
            layoutId="talent-wrapper"
            className="flex h-12 w-12 items-center justify-center bg-white text-3xl text-black"
            style={{ borderRadius: 12 }}
            onClick={onClickHandler}
          >
            <motion.span layoutId="work-icon" className="inline-block">
              <GrUserWorker />
            </motion.span>
          </motion.button>

          <AnimatePresence mode="popLayout">
            {show && (
              <motion.div
                layoutId="talent-wrapper"
                className="relative isolate w-full max-w-[600px] overflow-hidden p-4"
                style={{ borderRadius: 24 }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -inset-4 -z-10 bg-gradient-to-t from-[#333333] to-[rgba(32,30,30)]"
                />
                <div className="mb-4 flex items-center gap-2">
                  <motion.span
                    layoutId="work-icon"
                    className="inline-block text-4xl"
                  >
                    <GrUserWorker />
                  </motion.span>
                  <h1 className="text-3xl font-bold">My works</h1>
                </div>
                <p>
                  Hey there! Ready to dive into my world? Click that button and
                  let&apos;s take a stroll through some of my favorite works
                  together. Get ready to be wowed, inspired, and maybe even
                  crack a smile or two along the way. Can&apos;t wait to show
                  you what I&apos;ve been up to!
                </p>
                <Link
                  ref={scope}
                  href={"/talent"}
                  onClick={() => setShow(false)}
                  className="mt-8 inline-block rounded-lg bg-white p-2 px-8 text-black"
                  onMouseOver={onMouseOver}
                  onMouseLeave={onMouseLeave}
                >
                  <span className="inline-block">See what I can do</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            onClick={onCloseHandler}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed left-0 top-0 z-10 h-full w-full bg-black/50 backdrop-blur ${pathnameShow ? "hidden" : "block"}`}
          />
        )}
      </AnimatePresence>
    </>
  );
}

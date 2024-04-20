import React, { useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { GrUserWorker } from "react-icons/gr";
import Link from "next/link";

export default function Talent() {
  const color1 = useMotionValue("rgb(255, 255, 255)");
  const color2 = useMotionValue("rgb(255, 255, 255)");
  const [show, setShow] = useState(false);

  const [scope, animateNow] = useAnimate();

  const backgroundImage = useMotionTemplate`linear-gradient(${color1}, ${color2})`;

  const onClickHandler = () => {
    setShow(true);

    animate(color1, "hsl(0,0,20)");
    animate(color2, "rgba(32,30,30)");
  };

  const onCloseHandler = () => {
    setShow(false);

    animate(color1, "rgba(255, 255, 255)");
    animate(color2, "rgb(255, 255, 255)");
  };

  const onMouseOver = () => {
    animateNow("span", { scale: 1.1 });
  };
  const onMouseLeave = () => {
    animateNow("span", { scale: 1 });
  };

  return (
    <>
      <div className="bg-blue fixed bottom-0 right-0 z-20 p-8">
        <motion.div
          layout
          onClick={onClickHandler}
          className={`z-20 flex items-center justify-center shadow-2xl shadow-white/10 ${show ? "max-w-[800px] border border-muted/20 md:min-w-[800px]" : "border-transparent"}`}
          style={{ borderRadius: 10, backgroundImage }}
          transition={{
            duration: 0.5,
            type: "spring",
            bounce: 0,
          }}
        >
          {!show ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-full p-2 text-3xl text-black"
            >
              <GrUserWorker />
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-4"
            >
              <h1 className="mb-4 text-3xl font-bold">My works</h1>
              <p>
                Hey there! Ready to dive into my world? Click that button and
                let&apos;s take a stroll through some of my favorite works
                together. Get ready to be wowed, inspired, and maybe even crack
                a smile or two along the way. Can&apos;t wait to show you what
                I&apos;ve been up to!
              </p>
              <Link
                ref={scope}
                href={"/talent?design=1"}
                className="mt-8 inline-block rounded-lg bg-white p-2 px-8 text-black"
                onMouseOver={onMouseOver}
                onMouseLeave={onMouseLeave}
              >
                <span className="inline-block">See what I can do</span>
              </Link>
            </motion.div>
          )}
        </motion.div>

        <div className="grid-background fade-out-grid-background absolute right-0 top-0 -z-10 h-full w-full" />
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            onClick={onCloseHandler}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 top-0 z-10 h-full w-full bg-black/50 backdrop-blur"
          />
        )}
      </AnimatePresence>
    </>
  );
}
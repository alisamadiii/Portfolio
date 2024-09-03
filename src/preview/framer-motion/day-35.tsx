"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { TbWorld } from "react-icons/tb";
import { RxCopy } from "react-icons/rx";
import { LuUserPlus2 } from "react-icons/lu";

import { cn, myImage } from "@/utils";
import useMeasure from "react-use-measure";

export default function Day35() {
  const [isAnyone, setIsAnyone] = useState(true);

  const [ref, { height }] = useMeasure();

  return (
    <div className="h-96">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <motion.div
          layout="preserve-aspect"
          animate={{ height: height > 0 ? height : undefined }}
          className="relative w-[340px] overflow-hidden rounded-xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(0,0,0,.05)]"
        >
          <div ref={ref}>
            <div className="px-5 py-4">
              {/* Title */}
              <h2 className="text-xl font-medium">Share</h2>
              {/* Toggle Items */}
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F5F4F9] p-2">
                <div
                  className="flex aspect-square w-10 items-center justify-center rounded-xl bg-white text-2xl text-[#838385]"
                  style={{ flex: "0 0 auto" }}
                >
                  <TbWorld />
                </div>
                <div className="flex grow flex-col">
                  <h3 className="font-medium">Anyone</h3>
                  <small className="-mt-1 inline-block text-[#838385]">
                    Everyone with link can access
                  </small>
                </div>
                <Checkbox state={isAnyone} setState={setIsAnyone} />
              </div>
              {/* Copy Link */}
              <div className="mt-2 flex justify-between px-2 text-[#919193]">
                <small>goals/mastering-framer-motion</small>
                <button>
                  <RxCopy />
                </button>
              </div>
            </div>

            {/* Adding users */}
            <AnimatePresence>
              {!isAnyone ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, position: "absolute" }}
                  className="w-full px-5 pb-4"
                >
                  <h3 className="text-lg font-medium text-[#717172]">Invite</h3>
                  <Form />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}

function Checkbox({
  state,
  setState,
}: {
  state: boolean;
  setState: (a: boolean) => void;
}) {
  const onClickHandler = () => setState(!state);

  return (
    <button
      className={cn(
        "flex h-5 w-8 items-center rounded-full px-0.5 duration-200",
        state ? "justify-end bg-[#272628]" : "justify-start bg-[#ACABB9]"
      )}
      onClick={onClickHandler}
    >
      <motion.div
        layout
        className="aspect-square h-4 rounded-full bg-white"
        style={{ originY: "0px" }}
      />
    </button>
  );
}

function Form() {
  const [input, setInput] = useState("");
  const [userFound, setUserFound] = useState(false);

  const [invited, setInvited] = useState<string | null>(null);

  useEffect(() => {
    if (input.includes(" ")) {
      setUserFound(true);
    }
  }, [input]);

  const onInviteClickHandler = () => {
    setInvited(input);

    setUserFound(false);

    setInput("");
  };

  return (
    <div className="mt-2">
      <label className="flex h-10 items-center gap-2 rounded-lg border border-[#EEEEEE] p-1 focus-within:border-black">
        <LuUserPlus2 className="ml-1 text-lg text-[#858585]" />
        <div className="h-full grow">
          <AnimatePresence mode="popLayout">
            {userFound ? (
              <motion.div
                layoutId="user-wrapper"
                initial={{ x: 20, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                key={"user"}
                className="flex h-full w-fit items-center gap-1 border border-[#EEEEEE] px-0.5 pr-2"
                onClick={() => setUserFound(false)}
                style={{ borderRadius: 40 }}
              >
                <motion.img
                  layoutId="user-image"
                  src={myImage}
                  width={40}
                  height={40}
                  alt="my-image"
                  className="w-6 rounded-full object-cover"
                />
                <motion.span
                  layoutId="user-name"
                  className="text-sm text-[#919193]"
                >
                  {input}
                </motion.span>
              </motion.div>
            ) : (
              <motion.input
                key={"no-user"}
                exit={{ x: 20, opacity: 0, scale: 0.8 }}
                type="text"
                placeholder="Enter email to share"
                className="h-full outline-none placeholder:text-[#636363]"
                value={input}
                onChange={({ target }) => setInput(target.value)}
              />
            )}
          </AnimatePresence>
        </div>
        <button
          className="h-full rounded-md bg-black px-2 text-sm text-white"
          onClick={onInviteClickHandler}
        >
          Invite
        </button>
      </label>

      {invited && (
        <motion.div
          layoutId="user-wrapper"
          className="relative mt-4 flex w-full items-center gap-2 border border-[#EEEEEE] bg-white p-2"
          style={{ borderRadius: 8 }}
        >
          <motion.img
            layoutId="user-image"
            src={myImage}
            width={40}
            height={40}
            alt="my-image"
            className="w-10 rounded-full object-cover"
          />
          <motion.span layoutId="user-name" className="text-sm">
            {invited}
          </motion.span>
          <button
            className="absolute bottom-2 right-2 self-end text-sm text-red-700"
            onClick={() => setInvited(null)}
          >
            remove
          </button>
        </motion.div>
      )}
    </div>
  );
}

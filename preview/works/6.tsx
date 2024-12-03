"use client";

import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { NavigatingClick } from "@/components/NavigatingClick";
import IphoneSimulator from "@/components/IphoneSimulator";
import { Phone, Plus, Video } from "lucide-react";

const messages = [
  { from: 0, message: "How are you?" },
  { from: 1, message: "I am good thanks" },
  {
    from: 0,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
  {
    from: 0,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
  {
    from: 1,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
  {
    from: 0,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
];

const buttons = [
  "Camera",
  "Photo-&-video-library",
  "Order",
  "Catalog",
  "Quick replies",
  "Document",
];
const buttons2 = ["Location", "Contact", "Poll"];

export default function Work6() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMore, setIsMore] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);
  const onMoreClickHandler = () => setIsMore(!isMore);

  return (
    <IphoneSimulator className="bg-neutral-900 text-white [&>[data-top]]:bg-transparent">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <header className="sticky top-0 z-10 -mt-12 flex items-center rounded-t-[42px] bg-[#3B3A3D]/40 pb-2 pt-14 font-medium backdrop-blur-lg">
          <button className="w-12 pl-2 text-[#2099D6]">
            <svg
              viewBox="0 0 12 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-3"
            >
              <path
                d="M10.5312 1.36963L2.1398 9.47206C2.07194 9.53759 2.07194 9.64633 2.1398 9.71186L10.5312 17.8143"
                stroke="currentColor"
                strokeWidth="2.66667"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="flex grow items-center gap-2">
            <Image
              src={"/my-image.png"}
              width={40}
              height={40}
              alt="my-image"
              className="h-8 w-8 rounded-full object-cover"
            />
            <h2>Ali Samadi</h2>
          </div>
          <div className="flex items-center gap-3 pr-3 text-[#2099D6]">
            <button className="">
              <Video className="h-6 w-6" />
            </button>
            <button className="text-xl">
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </header>

        <ul className="mt-3 flex flex-col px-2">
          {messages.map((message, index) => (
            <li
              key={index}
              className={cn(
                "mb-2 flex w-fit max-w-[250px] flex-col rounded-lg p-2 pb-0.5 text-sm",
                message.from === 0 ? "bg-[#38363A]" : "self-end bg-[#005048]"
              )}
            >
              {message.message}
              <small className="self-end opacity-50">4:00 AM</small>
            </li>
          ))}
        </ul>

        <motion.form
          animate={{ y: isOpen ? "100%" : 0 }}
          className="sticky bottom-0 z-30 flex gap-2 border-t border-[#2B2A2C] bg-[#191819] px-2 pb-8 pt-2 text-[#2099D6]"
        >
          <button
            className="relative flex items-center justify-center text-3xl active:opacity-50"
            onClick={onClickHandler}
            type="button"
          >
            <NavigatingClick className="bg-black/20" />
            <Plus />
          </button>
          <input
            type="text"
            className="h-8 grow rounded-full border border-[#2B2A2C] bg-[#2E2D30] px-2 outline-none"
          />
          <div className="flex h-8 items-center justify-center gap-2 text-2xl">
            <button type="button">{/* <BsCamera /> */}</button>
            <button type="button" className="-translate-y-px">
              {/* <PiMicrophone /> */}
            </button>
          </div>
        </motion.form>

        {/* Lists coming from bottom */}
        <AnimatePresence>
          {isOpen && (
            <div className="absolute inset-0 isolate z-20 flex items-end px-2 pb-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-black/50"
              />
              <motion.div
                initial={{ y: "120%" }}
                animate={{ y: 0 }}
                exit={{ y: "120%" }}
                className="w-full"
              >
                <AnimatePresence mode="wait">
                  {isMore ? (
                    <motion.div
                      key={"active"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.3,
                        type: "spring",
                        bounce: 0,
                      }}
                      className="mb-1 flex flex-col justify-end overflow-hidden rounded-xl bg-[#222222]"
                    >
                      {buttons2.map((button) => (
                        <button
                          key={button}
                          className="h-12 border-b border-[#282628] px-4 text-start active:bg-[#2D2D2F]"
                        >
                          {button}
                        </button>
                      ))}
                      <button
                        className="h-12 border-b border-[#282628] px-4 text-start active:bg-[#2D2D2F]"
                        onClick={onMoreClickHandler}
                      >
                        More...
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"not-active"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.3,
                        type: "spring",
                        bounce: 0,
                      }}
                      className="mb-1 flex flex-col justify-end overflow-hidden rounded-xl bg-[#222222]"
                    >
                      {buttons.map((button) => (
                        <button
                          key={button}
                          className="h-12 border-b border-[#282628] px-4 text-start active:bg-[#2D2D2F]"
                        >
                          {button}
                        </button>
                      ))}
                      <button
                        className="h-12 border-b border-[#282628] px-4 text-start active:bg-[#2D2D2F]"
                        onClick={onMoreClickHandler}
                      >
                        More...
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  className="h-12 w-full rounded-xl bg-[#323032]"
                  onClick={onClickHandler}
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </IphoneSimulator>
  );
}

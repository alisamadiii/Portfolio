"use client";

import React, { useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

interface InitialValuesTypes {
  id: number;
  img: string;
  title: string;
  description: string;
}

const initialValues: InitialValuesTypes[] = [
  {
    id: 1,
    img: "https://linear.app/cdn-cgi/imagedelivery/fO02fVwohEs9s9UHFwon6A/fc435ee2-fabf-4f10-5a37-d89874f4bf00/f=auto,dpr=2,q=95,fit=scale-down,metadata=none",
    title: "Purpose-built for product development",
    description:
      "Purpose-built for product development Linear was developed with a specific purpose: to empower product teams to do their best work. Every aspect is intentionally designed to help teams focus on what they do best: Planning, building, and shipping great products. Because of its fit-to-purpose design, Linear is incredibly easy to use, but grows more powerful as you scale. It’s opinionated where it needs to be, but provides enough flexibility to adapt to your team’s unique way of working. We believe that this approach creates a better way to build products. And more than 10,000 product teams around the globe – from early-stage startups to public companies – agree.",
  },
  {
    id: 2,
    img: "https://linear.app/cdn-cgi/imagedelivery/fO02fVwohEs9s9UHFwon6A/0e6d3edd-cd37-4bf8-c1bf-b93960169400/f=auto,dpr=2,q=95,fit=scale-down,metadata=none",
    title: "Designed to move fast",
    description:
      "Purpose-built for product development Linear was developed with a specific purpose: to empower product teams to do their best work. Every aspect is intentionally designed to help teams focus on what they do best: Planning, building, and shipping great products. Because of its fit-to-purpose design, Linear is incredibly easy to use, but grows more powerful as you scale. It’s opinionated where it needs to be, but provides enough flexibility to adapt to your team’s unique way of working. We believe that this approach creates a better way to build products. And more than 10,000 product teams around the globe – from early-stage startups to public companies – agree.",
  },
  {
    id: 3,
    img: "https://linear.app/cdn-cgi/imagedelivery/fO02fVwohEs9s9UHFwon6A/99eeb9b8-3d99-4191-0081-9f302d26f400/f=auto,dpr=2,q=95,fit=scale-down,metadata=none",
    title: "Crafted to perfection",
    description:
      "Purpose-built for product development Linear was developed with a specific purpose: to empower product teams to do their best work. Every aspect is intentionally designed to help teams focus on what they do best: Planning, building, and shipping great products. Because of its fit-to-purpose design, Linear is incredibly easy to use, but grows more powerful as you scale. It’s opinionated where it needs to be, but provides enough flexibility to adapt to your team’s unique way of working. We believe that this approach creates a better way to build products. And more than 10,000 product teams around the globe – from early-stage startups to public companies – agree.",
  },
];

export default function Index() {
  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg,transparent,rgba(97,106,115,.12) 40%,rgba(97,106,115,.12) 60%,rgba(97,106,115,0))",
      }}
    >
      <header className="mx-auto grid max-w-5xl grid-cols-2 items-center">
        <h1 className="text-[56px] font-medium leading-[1.1em]">
          Made for modern product teams
        </h1>
        <p className="mx-auto max-w-[400px] text-[17px] text-[#969799]">
          Linear is shaped by the practices and principles that distinguish
          world-class product teams from the rest: relentless focus, fast
          execution, and a commitment to the quality of craft.
        </p>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-5xl flex-wrap gap-2">
        <MotionConfig transition={{ duration: 0.7, type: "spring", bounce: 0 }}>
          {initialValues.map((value) => (
            <EachCard key={value.id} value={value} />
          ))}
        </MotionConfig>
      </div>
    </div>
  );
}

function EachCard({ value }: { value: InitialValuesTypes }) {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);

  return (
    <div className="grow basis-[300px]">
      <motion.button
        layoutId={`wrapper-${value.id}`}
        className="h-full w-full overflow-hidden bg-black hover:brightness-125"
        style={{ transition: "filter 200ms", borderRadius: 24 }}
        onClick={onClickHandler}
      >
        <motion.img
          layoutId={`image-${value.id}`}
          src={value.img}
          width={400}
          height={400}
          alt=""
          className="mx-auto w-[280px]"
        />
        <span className="flex items-center justify-between gap-4 p-6 pr-8 text-start">
          <motion.h2 layoutId={`text-${value.id}`} className="text-[21px]">
            {value.title}
          </motion.h2>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20"
            style={{ flex: "0 0 auto" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="#9c9da1"
              role="img"
              focusable="false"
              aria-hidden="true"
            >
              <path d="M8.75 4C8.75 3.58579 8.41421 3.25 8 3.25C7.58579 3.25 7.25 3.58579 7.25 4V7.25H4C3.58579 7.25 3.25 7.58579 3.25 8C3.25 8.41421 3.58579 8.75 4 8.75H7.25V12C7.25 12.4142 7.58579 12.75 8 12.75C8.41421 12.75 8.75 12.4142 8.75 12V8.75H12C12.4142 8.75 12.75 8.41421 12.75 8C12.75 7.58579 12.4142 7.25 12 7.25H8.75V4Z"></path>
            </svg>
          </div>
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <div
            className="fixed left-0 top-0 flex h-full w-full items-end"
            onClick={onClickHandler}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 -z-20 bg-black/20 backdrop-blur-md"
            />

            {/* Main Container */}
            <motion.div
              layoutId={`wrapper-${value.id}`}
              className="mx-auto h-[93dvh] w-full max-w-4xl overflow-auto bg-black"
              style={{ borderRadius: "24px 24px 0px 0px" }}
            >
              <motion.img
                layoutId={`image-${value.id}`}
                src={value.img}
                width={400}
                height={400}
                alt=""
                className="mx-auto w-full"
              />
              <div className="relative z-50 mx-auto mt-[-200px] max-w-2xl pb-12">
                <motion.h2
                  layoutId={`text-${value.id}`}
                  className="relative inline-block max-w-[600px] text-[56px] font-medium"
                >
                  {value.title}
                </motion.h2>
                <p className="mt-8 text-[15px] text-[#969799]">
                  {value.description}
                </p>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

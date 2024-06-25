"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ArrowDown } from "lucide-react";
import Wrapper from "@/components/designs/wrapper";

const menuItems = ["testing", "testings124"];

enum Direction {
  ROW = "row",
  COLUMN = "column",
}

export default function Navigation() {
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction.ROW | Direction.COLUMN>(
    Direction.ROW
  );

  return (
    <Wrapper className="container flex min-h-screen flex-col items-center justify-center p-2 lg:w-1/2">
      <nav>
        <motion.ul
          className={clsx(
            "relative flex gap-4",
            direction === Direction.ROW ? "flex-row" : "flex-col"
          )}
          transition={{ duration: 2, ease: "easeInOut" }}
          layout
        >
          {menuItems.map((item, index) => (
            <motion.li
              layout
              key={index}
              tabIndex={0}
              className={clsx(
                "relative cursor-pointer rounded-lg px-3 py-1 text-center text-sm leading-relaxed transition-colors focus:outline-dotted focus:outline-1 focus:outline-slate-800",
                activeTab === index ? "text-gray-900" : "text-gray-700"
              )}
              transition={{ duration: 2, ease: "easeInOut" }}
              onFocus={() => setActiveTab(index)}
              onMouseOver={() => setActiveTab(index)}
              onMouseLeave={() => setActiveTab(index)}
            >
              {activeTab === index ? (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-lg bg-gray-700/5"
                />
              ) : null}
              <motion.span
                layout
                className="relative inline-block text-inherit"
              >
                {item}
              </motion.span>
            </motion.li>
          ))}
          <motion.li
            layout
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={clsx(
              direction === Direction.ROW ? "ml-8" : "mt-8 text-center"
            )}
          >
            <motion.button
              layout
              className="rounded-lg p-2 text-gray-800 transition-colors duration-300 hover:bg-neutral-100 focus:outline-dotted focus:outline-1 focus:outline-slate-800"
              onClick={() =>
                setDirection(
                  direction === Direction.ROW ? Direction.COLUMN : Direction.ROW
                )
              }
            >
              <ArrowDown
                size={16}
                className={clsx(
                  "transform transition-transform duration-300 ease-in-out",
                  direction === Direction.ROW ? "rotate-0" : "-rotate-90"
                )}
              />
            </motion.button>
          </motion.li>
        </motion.ul>
      </nav>
    </Wrapper>
  );
}

"use client";

import React, { useState } from "react";
import { IoMenu, IoClose } from "react-icons/io5";
import { IoIosArrowRoundBack } from "react-icons/io";

import { AnimatePresence, motion } from "framer-motion";
import { type ComponentInfo, NewIndex } from "@/app/talent/designs";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DesignNavbar() {
  const [isExpand, setIsExpand] = useState(false);

  const hiddenMenu = true;

  const params = useParams();

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-50 flex h-screen items-end">
      <AnimatePresence mode="popLayout">
        {isExpand && (
          <motion.div
            key={"content"}
            initial={{ x: "-100%", filter: "blur(4px)" }}
            animate={{ x: 0, filter: "blur(0px)" }}
            exit={{ x: "-100%", filter: "blur(4px)" }}
            transition={{ duration: 0.5, type: "spring", bounce: 0 }}
            className="pointer-events-auto h-[100dvh] w-64 p-4 backdrop-blur-sm"
          >
            <div className="h-full w-full overflow-auto rounded-xl border bg-white/70 p-1 shadow-md">
              <Link
                href={"/"}
                className="mb-4 flex items-center gap-1 p-1 text-sm"
              >
                <IoIosArrowRoundBack />
                Go back
              </Link>
              {Object.entries(NewIndex).map(([collection, data], index) => (
                <div key={index} className="mt-4 first-of-type:mt-1">
                  <h3 className="mb-2 px-1 text-xs font-light capitalize opacity-80">
                    {collection.replaceAll("-", " ")}
                  </h3>
                  <ul>
                    {data.map((d: ComponentInfo) => (
                      <li key={d.name}>
                        <Link
                          href={`/talent/${collection}/${d.name}`}
                          className={`inline-block w-full rounded-md p-1 text-sm capitalize hover:bg-gray-100 active:bg-gray-200 ${params.designs && params.design[1] === d.name && "font-bold"}`}
                        >
                          {d.name.replaceAll("-", " ")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {hiddenMenu && (
          <motion.button
            key={"button"}
            layout
            whileTap={{ scale: 0.8 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0 }}
            className="pointer-events-auto mb-4 ml-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white text-2xl text-black"
            onClick={() => setIsExpand(!isExpand)}
          >
            <div
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white"
              style={{ boxShadow: "0 5px 10px rgba(0,0,0,.1)" }}
            >
              <AnimatePresence mode="popLayout">
                {isExpand ? (
                  <motion.p key={"close"} transition={{ duration: 2 }}>
                    <IoClose />
                  </motion.p>
                ) : (
                  <motion.p key={"menu"} transition={{ duration: 2 }}>
                    <IoMenu />
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

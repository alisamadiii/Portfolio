"use client";

import React, { useState } from "react";
import { IoMenu } from "react-icons/io5";
import { AnimatePresence, motion } from "framer-motion";
import { NewIndex } from "@/app/talent/designs";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DesignNavbar() {
  const [isExpand, setIsExpand] = useState(false);

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
            className="pointer-events-auto h-screen w-64 p-4 backdrop-blur-sm"
          >
            <div className="h-full w-full rounded-xl border bg-white/70 p-1 shadow-md">
              {Object.entries(NewIndex).map(([collection, data], index) => (
                <div key={index} className="mt-4 first-of-type:mt-1">
                  <h3 className="mb-2 px-1 text-sm font-light capitalize">
                    {collection.replaceAll("-", " ")}
                  </h3>
                  <ul>
                    {data.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/talent/${collection}/${d.name}`}
                          className={`inline-block w-full rounded-md p-1 text-sm capitalize hover:bg-gray-100 active:bg-gray-200 ${params.design[1] === d.name && "font-bold"}`}
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

        <motion.button
          key={"button"}
          layout
          whileTap={{ scale: 0.8 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0 }}
          className="pointer-events-auto mb-4 ml-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white text-2xl text-black"
          onClick={() => setIsExpand(!isExpand)}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md bg-white"
            style={{ boxShadow: "0 5px 10px rgba(0,0,0,.1)" }}
          >
            <IoMenu />
          </div>
        </motion.button>
      </AnimatePresence>
    </div>
  );
}

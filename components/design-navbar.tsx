"use client";

import React, { useState } from "react";
import { IoMenu, IoClose } from "react-icons/io5";
import { IoIosArrowRoundBack , IoIosArrowDown } from "react-icons/io";
import { AnimatePresence, motion } from "framer-motion";

import { type ComponentInfo, NewIndex } from "@/app/talent/designs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/utils";

export default function DesignNavbar() {
  const [isExpand, setIsExpand] = useState(false);

  return (
    <>
      <div
        key={"content"}
        className={`fixed left-0 top-0 h-[100dvh] w-64 p-4 text-black backdrop-blur-sm duration-300 ${isExpand ? "translate-x-0" : "-translate-x-full blur-sm"}`}
      >
        <div className="h-full w-full overflow-auto rounded-xl border bg-white/70 p-1 shadow-md">
          <Link href={"/"} className="mb-4 flex items-center gap-1 p-1 text-sm">
            <IoIosArrowRoundBack />
            Go back
          </Link>
          {Object.entries(NewIndex).map(([collection, data], index) => (
            <EachSection key={index} collection={collection} data={data} />
          ))}
        </div>
      </div>

      <button
        className={`pointer-events-auto fixed bottom-4 left-4 mb-4 ml-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white text-2xl text-black duration-300 ${isExpand ? "translate-x-[230px]" : ""}`}
        onClick={() => setIsExpand(!isExpand)}
      >
        <div
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white"
          style={{ boxShadow: "0 5px 10px rgba(0,0,0,.1)" }}
        >
          {isExpand ? <IoClose /> : <IoMenu />}
        </div>
      </button>
    </>
  );
}

function EachSection({ collection, data }: { collection: string; data: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();

  const onClickHandler = () => setIsOpen(!isOpen);

  return (
    <div className="mt-4 first-of-type:mt-1">
      <button
        className="flex w-full items-center justify-between px-1 text-xs font-light capitalize opacity-80"
        onClick={onClickHandler}
      >
        {collection.replaceAll("-", " ")}
        <span
          className="duration-300"
          style={{ transform: isOpen ? "rotateX(180deg)" : "" }}
        >
          <IoIosArrowDown />
        </span>
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {data.map((d: ComponentInfo) => (
              <li key={d.name} className="first-of-type:mt-2">
                <Link
                  href={`/talent/${collection}/${d.name}`}
                  className={cn(
                    "inline-block w-full rounded-md p-1 text-sm capitalize hover:bg-gray-100 active:bg-gray-200",
                    params.design[1] === d.name && "font-bold"
                  )}
                >
                  {d.name.replaceAll("-", " ")}
                </Link>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

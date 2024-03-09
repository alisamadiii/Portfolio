"use client";

import React, { type ButtonHTMLAttributes, useEffect, useState } from "react";
import { IoIosArrowRoundForward, IoIosArrowRoundBack } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/utils";
import { useCurrentElementStore } from "../talent/page";
import { Index } from "../talent/designs";

export default function Arrows() {
  const { currentElement, setCurrentElement } = useCurrentElementStore();

  const handleNavigation = (action: "forward" | "backward") => {
    if (action === "forward") {
      if (currentElement === Index.length - 1) return;
      setCurrentElement(currentElement + 1);
    } else if (action === "backward") {
      if (currentElement === 0) return;
      setCurrentElement(currentElement - 1);
    }
  };

  const onClickHandler = (action: "forward" | "backward") => {
    handleNavigation(action);
  };

  useEffect(() => {
    const onKeyHandler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        handleNavigation("forward");
      } else if (event.key === "ArrowLeft") {
        handleNavigation("backward");
      }
    };

    document.addEventListener("keydown", onKeyHandler);

    return () => {
      document.removeEventListener("keydown", onKeyHandler);
    };
  }, [currentElement]);

  return (
    <div>
      <Button
        className="bottom-4 left-4"
        onClick={() => onClickHandler("backward")}
        disabled={currentElement === 0}
      >
        <IoIosArrowRoundBack />
      </Button>
      <Button
        className="bottom-4 right-4"
        onClick={() => onClickHandler("forward")}
        disabled={currentElement === Index.length - 1}
      >
        <IoIosArrowRoundForward />
      </Button>
    </div>
  );
}

interface ButtonType extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function Button({ children, className, ...props }: ButtonType) {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = () => setIsHover(true);
  const onMouseLeave = () => setIsHover(false);

  return (
    <button
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "fixed flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border text-2xl shadow-xl hover:bg-gray-100 disabled:opacity-50",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!isHover ? (
          <motion.span
            key={"first"}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.2, type: "tween" }}
          >
            {children}
          </motion.span>
        ) : (
          <motion.span
            key={"second"}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.2, type: "tween" }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

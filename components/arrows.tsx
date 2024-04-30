"use client";

import React, { type ButtonHTMLAttributes, useEffect, useState } from "react";
import { IoIosArrowRoundForward, IoIosArrowRoundBack } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/utils";
import { Index } from "../app/talent/designs";
import { useRouter, useSearchParams } from "next/navigation";

export default function Arrows() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const designNum = Number(searchParams.get("design"));

  const handleNavigation = (action: "forward" | "backward") => {
    if (action === "forward") {
      if (designNum === Index.length) return;

      router.push(`?design=${designNum + 1}`);
    } else if (action === "backward") {
      if (designNum === 1) return;

      router.push(`?design=${designNum - 1}`);
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
  }, [searchParams]);

  return (
    <div>
      <Button
        className="bottom-4 left-4"
        onClick={() => onClickHandler("backward")}
        disabled={designNum === 0}
      >
        <IoIosArrowRoundBack />
      </Button>
      <Button
        className="bottom-4 right-4"
        onClick={() => onClickHandler("forward")}
        disabled={designNum === Index.length - 1}
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
        "fixed flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-white text-2xl shadow-xl hover:bg-gray-100 disabled:opacity-50",
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

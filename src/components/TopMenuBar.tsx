"use client";

import React from "react";

import { cn } from "@/utils";
import { useRouter } from "next/navigation";
import { useElementsOpening } from "@/context/useElementOpening";

interface GeneralProps {
  children: React.ReactNode;
  className?: string;
}

export function Wrapper({ children, className }: GeneralProps) {
  return (
    <header
      className={cn(
        "sticky left-0 top-0 z-[100] mb-[1.6rem] flex h-[46px] w-full shrink-0 items-center justify-center border-b-[0.33px] border-b-wrapper bg-background md:mb-[1.13rem] md:h-[68px] md:bg-transparent",
        className
      )}
    >
      {children}
    </header>
  );
}

interface SideProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  path?: string;
}

export function Left({ children, className, onClick, path }: SideProps) {
  const { setCurrentOpen } = useElementsOpening();

  const router = useRouter();

  return (
    <div className={cn("absolute left-2 flex h-full items-center", className)}>
      {children || (
        <button
          onClick={() => {
            if (onClick) {
              onClick();
            } else if (path) {
              router.push(path);
            } else {
              setCurrentOpen(null);
            }
          }}
          className="flex aspect-square h-[80%] -translate-x-3 items-center justify-center md:hidden"
        >
          <svg
            width="12"
            height="20"
            viewBox="0 0 12 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.4453 1.86719L2.05386 9.96962C1.986 10.0351 1.986 10.1439 2.05386 10.2094L10.4453 18.3118"
              stroke="currentColor"
              stroke-width="2.66667"
              stroke-linecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export function Middle({ children, className }: GeneralProps) {
  return (
    <div className={cn("", className)}>
      <span className="text-[1.018rem] font-bold tracking-[-0.03rem] md:text-[1.16rem] md:font-semibold md:tracking-[0.00581rem]">
        {children}
      </span>
    </div>
  );
}

export function Right({ children, className, onClick }: SideProps) {
  const { setCurrentOpen } = useElementsOpening();

  return (
    <div className={cn("absolute right-4 md:right-7", className)}>
      {children || (
        <button
          onClick={() => {
            if (onClick) {
              onClick();
            } else {
              setCurrentOpen(null);
            }
          }}
          className="hidden md:block"
        >
          Close
        </button>
      )}
    </div>
  );
}

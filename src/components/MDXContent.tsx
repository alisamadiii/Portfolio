"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useMDXComponent } from "next-contentlayer/hooks";
import Image from "next/image";
import { cn } from "@/utils";
import TechIcons from "./TechIcons";
import CopyButton from "./CopyButton";
import { Tab, Tabs } from "./Tabs";
import ComponentPreview from "./PreviewComponent";
import { Files, File } from "./FilesTab";

const components = {
  h1: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="group mb-8 flex scroll-m-12 items-center gap-2 text-4xl font-bold hover:text-primary-hover [&+p]:!mt-0 [&_a]:text-inherit [&_code]:text-[21px]"
      {...props}
    >
      {children}

      <svg
        viewBox="0 0 16 16"
        height="0.7em"
        width="0.7em"
        className="hidden group-hover:block"
      >
        <g strokeWidth="1.2" fill="none" stroke="currentColor">
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.995,7.005 L8.995,7.005c1.374,1.374,1.374,3.601,0,4.975l-1.99,1.99c-1.374,1.374-3.601,1.374-4.975,0l0,0c-1.374-1.374-1.374-3.601,0-4.975 l1.748-1.698"
          ></path>
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.005,8.995 L7.005,8.995c-1.374-1.374-1.374-3.601,0-4.975l1.99-1.99c1.374-1.374,3.601-1.374,4.975,0l0,0c1.374,1.374,1.374,3.601,0,4.975 l-1.748,1.698"
          ></path>
        </g>
      </svg>
    </h1>
  ),
  h2: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="group mb-6 mt-12 flex w-full scroll-m-12 items-center gap-2 border-t-wrapper-2 pt-6 text-2xl font-medium hover:text-primary-hover [&+p]:!mt-0 [&_a:hover]:text-primary-hover [&_a]:text-inherit [&_code]:text-[21px]"
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 16 16"
        height="0.6em"
        width="0.6em"
        className="hidden group-hover:block"
      >
        <g strokeWidth="1.2" fill="none" stroke="currentColor">
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            d="M8.995,7.005 L8.995,7.005c1.374,1.374,1.374,3.601,0,4.975l-1.99,1.99c-1.374,1.374-3.601,1.374-4.975,0l0,0c-1.374-1.374-1.374-3.601,0-4.975 l1.748-1.698"
          ></path>
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            d="M7.005,8.995 L7.005,8.995c-1.374-1.374-1.374-3.601,0-4.975l1.99-1.99c1.374-1.374,3.601-1.374,4.975,0l0,0c1.374,1.374,1.374,3.601,0,4.975 l-1.748,1.698"
          ></path>
        </g>
      </svg>
    </h2>
  ),
  h3: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="group mb-[0.6rem] mt-[1.6rem] flex scroll-m-12 items-center gap-2 text-xl font-medium hover:text-primary-hover [&+p]:!mt-0 [&_a:hover]:text-primary-hover [&_a]:text-inherit [&_code]:text-[21px]"
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 16 16"
        height="0.6em"
        width="0.6em"
        className="hidden group-hover:block"
      >
        <g strokeWidth="1.2" fill="none" stroke="currentColor">
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            d="M8.995,7.005 L8.995,7.005c1.374,1.374,1.374,3.601,0,4.975l-1.99,1.99c-1.374,1.374-3.601,1.374-4.975,0l0,0c-1.374-1.374-1.374-3.601,0-4.975 l1.748-1.698"
          ></path>
          <path
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            d="M7.005,8.995 L7.005,8.995c-1.374-1.374-1.374-3.601,0-4.975l1.99-1.99c1.374-1.374,3.601-1.374,4.975,0l0,0c1.374,1.374,1.374,3.601,0,4.975 l-1.748,1.698"
          ></path>
        </g>
      </svg>
    </h3>
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <p className="my-[20px] scroll-m-20 font-normal leading-7" {...props} />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-5 scroll-m-20 pl-8 text-base leading-7" {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="text-muted-3 relative my-2 flex items-center before:absolute before:top-3 before:h-px before:w-[6.8px] before:-translate-x-5 before:bg-[#888]"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded-md border-code bg-code px-[0.25rem] py-[0.12rem] text-sm"
      {...props}
    ></code>
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="rounded-md border-wrapper p-[22.4px] text-sm [&_code]:text-xs [&_li]:block [&_li]:text-sm [&_p]:my-0"
      {...props}
    ></blockquote>
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <table
      className={cn(
        "[&_a>code]: my-8 w-full text-sm [&>thead]:hidden [&_a>code:hover]:text-opacity-70 [&_a>code]:!text-primary [&_code]:text-[12.25px]",
        className
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className={cn("h-[41px] border-t-wrapper-2", className)} {...props} />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className={cn("px-4 py-2 text-left font-bold", className)} {...props} />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className={cn("px-4 py-2 text-left", className)} {...props} />
  ),
  // START - Code Syntax Highlighter
  figure: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLPreElement> & {}) => {
    const [isLong, setIsLong] = useState(false);
    const [spanNum, setSpanNum] = useState(0);
    const [initialized, setInitialized] = useState(false);

    const figureRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const spans = figureRef.current?.querySelectorAll("code > span");

      if (spans) {
        setSpanNum(spans.length);

        if (spans.length > 30) {
          setIsLong(true);
        }
      }

      setInitialized(true);
    }, []);

    return (
      <figure
        ref={figureRef}
        className={cn(
          "group relative my-4 w-full overflow-auto rounded-md border-wrapper [&_[data-line]]:px-[20px] [&_code]:rounded-none [&_code]:border-none [&_code]:!bg-transparent [&_code]:px-0 [&_code]:py-[20px] [&_code]:text-[13px]",
          !initialized && "max-h-[400px] overflow-hidden",
          isLong && "max-h-[400px]",
          spanNum > 30 && isLong && "overflow-hidden",
          !isLong && spanNum > 30 && "max-h-[600px]"
        )}
        {...props}
      >
        {!figureRef.current?.querySelector("figcaption") && (
          <CopyButton
            value={figureRef.current?.querySelector("pre")?.textContent || ""}
            className="sticky left-2 right-2 top-2 mb-[-32px] ml-auto hidden group-hover:flex"
          />
        )}

        {children}
        {spanNum > 30 && (
          <div
            className={cn(
              "pointer-events-none sticky bottom-0 left-0 flex h-[100px] w-full items-center justify-center bg-gradient-to-b from-code-gradient-from to-code-gradient-to",
              !isLong && "h-12 from-transparent to-transparent"
            )}
          >
            <button
              className="text-background pointer-events-auto absolute bottom-6 rounded-lg bg-foreground px-3 py-2 text-sm"
              onClick={() => {
                setIsLong(!isLong);
                if (figureRef.current) {
                  figureRef.current.style.scrollBehavior = "auto";
                  figureRef.current.scrollTop = 0;
                  figureRef.current.scrollLeft = 0;
                }
              }}
            >
              {isLong ? (
                <span>
                  Expand{" "}
                  <span className="text-xs opacity-80">
                    ({spanNum - 30} lines)
                  </span>
                </span>
              ) : (
                "Collapse"
              )}
            </button>
          </div>
        )}
      </figure>
    );
  },
  figcaption: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLPreElement> & {}) => {
    const copyTextRef = useRef<HTMLPreElement>(null);
    const [_, setIsMounted] = useState(false);

    useEffect(() => {
      if (copyTextRef.current) {
        setIsMounted(true);
      }
    }, []);

    return (
      <figcaption
        ref={copyTextRef}
        className="sticky left-0 top-0 flex h-[48px] items-center gap-2 border-b-wrapper bg-code-figcaption pl-4 pr-3 text-[13px] text-muted"
        {...props}
      >
        <TechIcons
          // @ts-ignore
          name={props["data-language"]}
          className=""
        />
        <span className="inline-block grow">
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                copyTextRef.current?.querySelector("span")
                  ?.textContent as string
              )
            }
            className="hover:opacity-80 active:scale-95"
            title="Copy"
          >
            {children}
          </button>
        </span>
        {copyTextRef.current && (
          <CopyButton
            value={copyTextRef.current?.nextElementSibling?.textContent || ""}
          />
        )}
      </figcaption>
    );
  },
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement> & {}) => {
    return (
      <>
        <pre {...props} />
      </>
    );
  },
  // END - Code Syntax Highlighter
  a: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        "font-medium text-primary hover:text-primary-hover",
        className
      )}
      {...props}
    />
  ),
  img: ({ className, alt, ...props }: React.ComponentProps<typeof Image>) => (
    <Image
      className={cn("my-8 rounded-md", className)}
      width={800}
      height={800}
      alt={alt}
      {...props}
    />
  ),
  Tabs,
  Tab,
  Files,
  File,
  ComponentPreview,
};

export function Mdx({ code }: { code: string }) {
  const Component = useMDXComponent(code);

  return (
    <div className="mdx">
      {/* @ts-ignore */}
      <Component components={components} />
    </div>
  );
}

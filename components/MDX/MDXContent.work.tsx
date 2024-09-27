/* eslint-disable */

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useMDXComponent } from "next-contentlayer2/hooks";
import Image from "next/image";
import { cn } from "@/lib/utils";
import TechIcons from "../TechIcons";
import CopyButton from "../CopyButton";
import { Text } from "../ui/text";
import { CodePreview } from "../CodePreview";
import ComponentPreview from "../ComponentPreview";

const components = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Text
      element="h1"
      variant={"h1"}
      {...props}
      className="mx-auto mb-8 max-w-xl scroll-mt-8"
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
    </Text>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Text
      element="h2"
      variant={"h2"}
      className="mx-auto mb-5 mt-8 max-w-xl scroll-mt-8"
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
    </Text>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Text
      element="h3"
      variant={"h3"}
      className="mx-auto mb-5 mt-6 max-w-xl scroll-mt-8"
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
    </Text>
  ),
  p: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Text
      element="p"
      variant={"p1-r"}
      className="paragraph mb-4 text-natural-800"
      {...props}
    />
  ),
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="mx-auto my-5 max-w-xl scroll-m-20 pl-8 text-base leading-7"
      {...props}
    />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="text-muted-3 relative my-2 flex items-center before:absolute before:top-3 before:h-px before:w-[6.8px] before:-translate-x-5 before:bg-[#888]"
      {...props}
    />
  ),
  code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="border-code rounded-md bg-natural-200 px-[0.25rem] py-[0.12rem] text-sm"
      {...props}
    ></code>
  ),
  blockquote: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="rounded-md border border-natural-200 p-[22.4px] text-sm [&_code]:text-xs [&_li]:block [&_li]:text-sm [&_p]:my-0"
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
    <tr className={cn("border-t-wrapper-2 h-[41px]", className)} {...props} />
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
    ...props
  }: React.HTMLAttributes<HTMLPreElement> & {}) => {
    const figureRef = useRef<HTMLPreElement>(null);

    return (
      <figure
        ref={figureRef}
        className={cn(
          "border-wrapper group relative mx-auto my-4 max-h-96 w-full max-w-xl overflow-auto rounded-md bg-natural-150 shadow-custom-card [&_[data-line]]:px-[20px] [&_code]:rounded-none [&_code]:border-none [&_code]:!bg-transparent [&_code]:px-0 [&_code]:py-[20px] [&_code]:text-[13px]"
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
      </figure>
    );
  },
  figcaption: ({
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
        className="sticky left-0 top-0 flex h-[48px] items-center gap-2 border-b bg-natural-150 pl-4 pr-3 text-[13px] text-natural-700"
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
  pre: ({ ...props }: React.HTMLAttributes<HTMLPreElement> & {}) => {
    return <pre {...props} />;
  },
  // END - Code Syntax Highlighter
  a: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        "hover:text-primary-hover font-medium text-primary",
        className
      )}
      {...props}
    />
  ),
  img: ({ className, alt, ...props }: React.ComponentProps<typeof Image>) => (
    <Image
      className={cn(
        "my-8 w-full rounded-md border border-natural-200",
        className
      )}
      width={800}
      height={800}
      alt={alt}
      {...props}
    />
  ),
  CodePreview,
  ComponentPreview,
};

export function Mdx({ code }: { code: string }) {
  const Component = useMDXComponent(code);

  // @ts-ignore
  return <Component components={components} />;
}

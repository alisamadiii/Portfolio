import React from "react";

import Link from "next/link";
import { GeistMono } from "geist/font/mono";

import { useMDXComponent } from "next-contentlayer/hooks";
import Image from "next/image";
import { cn } from "@/utils";
import FAQ from "./faq";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/tooltip";
import LinkMetadata from "./LinkMetadata";
import Balancer from "react-wrap-balancer";
import Gallery from "./gallery";
import Video from "./video";
import DisplayAnimatedContents from "./display-animated-contents";
import ImageExplain from "./ImageExplain";

const components = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight"
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Balancer
      as={"h2"}
      className="mb-6 mt-12 scroll-m-20 text-2xl font-bold tracking-tight"
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Balancer
      as={"h3"}
      className="mb-6 mt-8 block w-full scroll-m-20 text-xl font-bold tracking-tight"
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <p
      className="my-2 scroll-m-20 text-base leading-7 text-muted-3"
      {...props}
    />
  ),
  a: ({ className, ...props }: React.HTMLAttributes<HTMLAnchorElement>) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <a
            target="_blank"
            className="text-muted-3 underline hover:text-foreground"
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Visit the link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-5 scroll-m-20 pl-8 text-base leading-7 text-[#434343]"
      {...props}
    />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="relative my-2 flex items-center text-muted-3 before:absolute before:h-1 before:w-1 before:-translate-x-5 before:rounded-full before:bg-muted"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className={`text-sm ${GeistMono.className}`} {...props}></code>
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="my-4 border-l border-border pl-4 italic [&>p]:text-sm [&>p]:leading-6 [&>p]:text-white [&>p]:md:text-base"
      {...props}
    ></blockquote>
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className={cn("w-full", className)} {...props} />
    </div>
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className={cn("m-0 border-t p-0 even:bg-muted", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        "border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn(
        "border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  Link: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn("font-medium underline underline-offset-4", className)}
      {...props}
    />
  ),
  Image: ({ className, alt, ...props }: React.ComponentProps<typeof Image>) => (
    <Image className={cn("rounded-md", className)} alt={alt} {...props} />
  ),
  FaqFrontEnd: FAQ,
  LinkMetadata,
  Gallery,
  Video,
  DisplayAnimatedContents,
  ImageExplain,
};

export function Mdx({ code }: { code: string }) {
  const Component = useMDXComponent(code);

  return (
    <div className="mdx">
      <Component components={components} />
    </div>
  );
}

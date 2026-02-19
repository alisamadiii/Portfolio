import Link from "next/link";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { cn } from "@workspace/ui/lib/utils";

import { Videos } from "./videos";

export const mdxComponents: MDXComponents = {
  ...defaultComponents,
  h1: ({ children, ...props }) => (
    <h1
      className={cn(
        "hover:text-primary-hover group mb-8 flex scroll-m-12 items-center gap-2 text-4xl font-bold [&_code]:text-[21px] [&+p]:mt-0!",
        "[&_a]:hover:text-foreground [&_a]:text-inherit [&_a]:no-underline"
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        "hover:text-primary-hover group mt-12 mb-6 flex w-full scroll-m-12 items-center gap-2 pt-6 text-2xl font-medium [&_code]:text-[21px] [&+p]:mt-0!",
        "[&_a]:hover:text-foreground [&_a]:text-inherit [&_a]:no-underline"
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        "hover:text-primary-hover group mt-[1.6rem] mb-[0.6rem] flex scroll-m-12 items-center gap-2 text-xl font-medium [&_code]:text-[21px] [&+p]:mt-0!",
        "[&_a]:hover:text-foreground [&_a]:text-inherit [&_a]:no-underline"
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <p
      className="scroll-m-20 text-justify text-xl leading-relaxed font-normal [&:has(+p)]:mb-8"
      {...props}
    />
  ),
  ol: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-5 scroll-m-20 list-decimal pl-8 text-lg leading-relaxed"
      {...props}
    />
  ),
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-5 scroll-m-20 list-disc pl-8 text-lg leading-relaxed"
      {...props}
    />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="relative my-2" {...props} />
  ),
  code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="border-code bg-code rounded-md px-1 py-[0.12rem] text-sm"
      {...props}
    ></code>
  ),
  blockquote: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="text-muted-foreground border-l-2 p-2 [&_code]:text-xs [&_li]:block [&_li]:text-sm [&_p]:my-0 [&_p]:text-base"
      {...props}
    ></blockquote>
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <table
      className={cn(
        "[&_a>code]: [&_a>code]:text-primary! [&_a>code:hover]:text-opacity-70 my-8 w-full text-sm [&_code]:text-[12.25px] [&>thead]:hidden",
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
  a: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        "font-medium text-blue-500 underline hover:text-blue-600",
        className
      )}
      {...props}
    />
  ),
  img: (props) => (
    <ImageZoom
      className="rounded-xl outline-2 outline-offset-2 outline-black/10"
      {...(props as any)}
    />
  ),
  // AutoTypeTable: (props) => (
  //   <AutoTypeTable {...props} generator={generator} />
  // ),
  // Preview: (props) => (
  //   <Preview name={props.name} className={props.className} />
  // ),
  Step,
  Steps,
  Videos,
};

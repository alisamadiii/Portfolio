import Link from "next/link";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { cn } from "@workspace/ui/lib/utils";

export const mdxComponents: MDXComponents = {
  ...defaultComponents,
  h1: ({ children, ...props }) => (
    <h1
      className={cn(
        "hover:text-primary-hover [&+p]:mt-0! group mb-8 flex scroll-m-12 items-center gap-2 text-4xl font-bold [&_code]:text-[21px]",
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
        "hover:text-primary-hover [&+p]:mt-0! group mb-6 mt-12 flex w-full scroll-m-12 items-center gap-2 pt-6 text-2xl font-medium [&_code]:text-[21px]",
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
        "hover:text-primary-hover [&+p]:mt-0! group mb-[0.6rem] mt-[1.6rem] flex scroll-m-12 items-center gap-2 text-xl font-medium [&_code]:text-[21px]",
        "[&_a]:hover:text-foreground [&_a]:text-inherit [&_a]:no-underline"
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <p
      className="scroll-m-20 text-justify text-xl font-normal leading-relaxed [&:has(+p)]:mb-8"
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
      className="border-wrapper rounded-md p-[22.4px] text-sm [&_code]:text-xs [&_li]:block [&_li]:text-sm [&_p]:my-0"
      {...props}
    ></blockquote>
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <table
      className={cn(
        "[&_a>code]: [&_a>code]:text-primary! my-8 w-full text-sm [&>thead]:hidden [&_a>code:hover]:text-opacity-70 [&_code]:text-[12.25px]",
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
  img: ({ className, alt, ...props }: React.ComponentProps<"img">) => (
    <img className={cn("my-8 rounded-md", className)} alt={alt} {...props} />
  ),
  // AutoTypeTable: (props) => (
  //   <AutoTypeTable {...props} generator={generator} />
  // ),
  // Preview: (props) => (
  //   <Preview name={props.name} className={props.className} />
  // ),
  Step,
  Steps,
};

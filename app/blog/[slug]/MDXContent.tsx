import Link from "next/link";
import { GeistMono } from "geist/font/mono";

import { useMDXComponent } from "next-contentlayer/hooks";
import Image from "next/image";
import { cn } from "@/utils";

const components = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight"
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mb-6 mt-12 scroll-m-20 text-3xl font-bold tracking-tight"
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <p
      className="text-muted-3 my-5 scroll-m-20 text-base leading-7"
      {...props}
    />
  ),
  a: ({ className, ...props }: React.HTMLAttributes<HTMLAnchorElement>) => (
    <a
      target="_blank"
      className="text-muted-3 underline hover:text-foreground"
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-5 scroll-m-20 pl-8 text-base leading-7 text-[#434343]"
      {...props}
    />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="text-muted-3 relative my-2 flex items-center before:absolute before:h-1 before:w-1 before:-translate-x-5 before:rounded-full before:bg-muted"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className={`text-sm ${GeistMono.className}`} {...props}></code>
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="border-l border-border pl-4 italic [&>p]:text-white"
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
    <Link className={"font-medium underline underline-offset-4"} {...props} />
  ),
  Image: ({ className, alt, ...props }: React.ComponentProps<typeof Image>) => (
    <Image className={cn("rounded-md", className)} alt={alt} {...props} />
  ),
};

export function Mdx({ code }: { code: string }) {
  const Component = useMDXComponent(code);

  return (
    <div className="mdx">
      <Component components={components} />
    </div>
  );
}

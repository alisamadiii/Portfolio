import Link from "next/link";
import { GeistMono } from "geist/font/mono";

import { useMDXComponent } from "next-contentlayer/hooks";

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
      className="my-5 scroll-m-20 text-base leading-7 text-[#d4d4d4]"
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
      className="relative my-2 flex items-center text-[#d4d4d4] before:absolute before:h-1 before:w-1 before:-translate-x-5 before:rounded-full before:bg-muted"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className={`text-sm ${GeistMono.className}`} {...props}></code>
  ),
  Link: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link className={"font-medium underline underline-offset-4"} {...props} />
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

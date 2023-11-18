import Link from "next/link";

import { useMDXComponent } from "next-contentlayer/hooks";

const components = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="mb-3 rounded-xl bg-[rgb(24,24,27)] py-4 font-mono text-sm"
      {...props}
    ></code>
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

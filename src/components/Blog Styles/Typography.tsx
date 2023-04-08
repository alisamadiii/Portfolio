import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Heading1({ children, ...props }: Props) {
  return (
    <h1 className="mb-6 text-4xl font-black tracking-tight" {...props}>
      {children}
    </h1>
  );
}

export function Heading2({ children, ...props }: Props) {
  return (
    <h2 className="mt-8 mb-4 text-3xl font-extrabold" {...props}>
      {children}
    </h2>
  );
}

export function Text({ children }: Props) {
  return <p className="my-2 text-sm/7 md:text-lg/8">{children}</p>;
}

export function Anchor({ children, ...props }: Props) {
  return (
    <a
      {...props}
      className="px-1 font-medium text-blue-800 underline duration-100 rounded-md hover:bg-blue-800/10"
    >
      {children}
    </a>
  );
}

export function BlockQuotes({ children }: Props) {
  return (
    <blockquote className="px-4 py-2 my-4 text-lg italic border-l-4 border-secondary bg-secondary/10 rounded-r-xl">
      {children}
    </blockquote>
  );
}

export function Unordered_List({ children }: Props) {
  return <ul className="pl-8 list-disc">{children}</ul>;
}

export function Ordered_List({ children }: Props) {
  return <ol className="pl-8 list-decimal">{children}</ol>;
}

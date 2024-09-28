import React from "react";
import { Prism } from "react-syntax-highlighter";

import CopyButton from "./CopyButton";
import { githubLight } from "./GithubTheme";

type Props = {
  children?: React.ReactNode;
  language?: "css" | "html" | "javascript";
};

export default function SyntaxHighlighter({
  children,
  language = "javascript",
}: Props) {
  const getTextFromChildren = (children: React.ReactNode): string => {
    if (typeof children === "string") {
      return children;
    }
    if (Array.isArray(children)) {
      return children
        .map((child) => (typeof child === "string" ? child : ""))
        .join("");
    }
    return "";
  };

  const codeText = getTextFromChildren(children);

  return (
    <div className="relative w-full">
      {/* @ts-ignore */}
      <Prism language={language} style={githubLight}>
        {children}
      </Prism>
      <CopyButton value={codeText} className="absolute right-2 top-2" />
    </div>
  );
}

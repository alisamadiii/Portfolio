import React, { useEffect, useState } from "react";
import { cn } from "@/utils";

type Props = {
  value: string;
  className?: string;
};

export default function CopyButton({ value, className }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1500);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value || "");

    setCopied(true);
  };

  return (
    <button
      className={cn(
        "text-muted flex h-8 w-8 items-center justify-center rounded-md duration-200 hover:bg-[#ebebeb] dark:hover:bg-[#1f1f1f]",
        className
      )}
      onClick={handleCopy}
      disabled={copied}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "absolute w-[20px] duration-300 will-change-transform",
          copied ? "scale-50 opacity-0" : "scale-100 opacity-100 delay-100"
        )}
      >
        <path
          d="M6 17C4.89543 17 4 16.1046 4 15V5C4 3.89543 4.89543 3 6 3H13C13.7403 3 14.3866 3.4022 14.7324 4M11 21H18C19.1046 21 20 20.1046 20 19V9C20 7.89543 19.1046 7 18 7H11C9.89543 7 9 7.89543 9 9V19C9 20.1046 9.89543 21 11 21Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "absolute w-[20px] duration-300 will-change-transform",
          copied ? "scale-100 opacity-100 delay-100" : "scale-50 opacity-0"
        )}
      >
        <path
          d="M20 6L9 17L4 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

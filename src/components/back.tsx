import { MoveLeft } from "lucide-react";
import React from "react";
import Link from "next/link";
import { textVariants } from "./ui/text";

type Props = { to: string };

export default function Back({ to }: Props) {
  return (
    <Link
      href={to}
      className={textVariants({
        size: 14,
        className:
          "flex items-center gap-2 mt-20 mb-16 text-accents-6 hover:text-white",
      })}
    >
      <svg
        width="14"
        height="9"
        viewBox="0 0 14 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0.707 4.5L0.353 4.146L0 4.5L0.353 4.854L0.707 4.5ZM1.061 4.854L5.061 0.854003L4.353 0.146003L0.353 4.146L1.061 4.854ZM0.353 4.854L4.353 8.854L5.061 8.146L1.061 4.146L0.353 4.854ZM0.707 5L13.207 5V4L0.707 4L0.707 5Z"
          fill="currentColor"
        />
      </svg>
      back
    </Link>
  );
}

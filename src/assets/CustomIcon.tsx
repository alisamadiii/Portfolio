import React from "react";

type Props = {
  icon: "back-arrow" | "3-dots";
  className?: string;
};

export default function CustomIcon({ icon, className }: Props) {
  const currentIcon = {
    "back-arrow": (
      <svg
        width="14"
        height="9"
        viewBox="0 0 14 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M0.707 4.5L0.353 4.146L0 4.5L0.353 4.854L0.707 4.5ZM1.061 4.854L5.061 0.854003L4.353 0.146003L0.353 4.146L1.061 4.854ZM0.353 4.854L4.353 8.854L5.061 8.146L1.061 4.146L0.353 4.854ZM0.707 5L13.207 5V4L0.707 4L0.707 5Z"
          fill="currentColor"
        />
      </svg>
    ),
    "3-dots": (
      <svg
        width="4"
        height="14"
        viewBox="0 0 4 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M2 14C3.10457 14 4 13.1046 4 12C4 10.8954 3.10457 10 2 10C0.89543 10 0 10.8954 0 12C0 13.1046 0.89543 14 2 14Z"
          fill="currentColor"
        />
        <path
          d="M2 9C3.10457 9 4 8.10457 4 7C4 5.89543 3.10457 5 2 5C0.89543 5 0 5.89543 0 7C0 8.10457 0.89543 9 2 9Z"
          fill="currentColor"
        />
        <path
          d="M2 4C3.10457 4 4 3.10457 4 2C4 0.89543 3.10457 0 2 0C0.89543 0 0 0.89543 0 2C0 3.10457 0.89543 4 2 4Z"
          fill="currentColor"
        />
      </svg>
    ),
  }[icon];

  return currentIcon;
}

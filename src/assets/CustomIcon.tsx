import React from "react";

type Props = {
  icon: "back-arrow";
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
  }[icon];

  return currentIcon;
}

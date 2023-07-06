import React, { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends HTMLAttributes<HTMLOrSVGElement> {}

export default function Tailwind({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 65 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge("h-16", className)}
      {...props}
    >
      <path
        d="M49.6835 0H15.4633C7.12542 0 0.366211 6.75921 0.366211 15.0971V49.3173C0.366211 57.6552 7.12542 64.4144 15.4633 64.4144H49.6835C58.0214 64.4144 64.7806 57.6552 64.7806 49.3173V15.0971C64.7806 6.75921 58.0214 0 49.6835 0Z"
        fill="#242938"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.2506 27.6781C22.7603 21.6393 26.5348 18.6199 32.5734 18.6199C41.6317 18.6199 42.764 25.4136 47.2931 26.5459C50.3128 27.301 52.9545 26.1687 55.2191 23.149C53.7096 29.1876 49.9348 32.2073 43.8963 32.2073C34.838 32.2073 33.7057 25.4136 29.1766 24.2813C26.1569 23.5264 23.5151 24.6587 21.2506 27.6781ZM9.92773 41.2656C11.4374 35.227 15.2117 32.2073 21.2506 32.2073C30.3088 32.2073 31.4411 39.001 35.9703 40.1333C38.9899 40.8884 41.6317 39.7561 43.8963 36.7364C42.3868 42.775 38.612 45.7947 32.5734 45.7947C23.5151 45.7947 22.3829 39.001 17.8537 37.8687C14.8343 37.1136 12.1923 38.2459 9.92773 41.2656Z"
        fill="url(#paint0_linear_336_93)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_336_93"
          x1="22.1312"
          y1="18.6199"
          x2="41.5059"
          y2="46.6754"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#32B1C1" />
          <stop offset="1" stopColor="#14C6B7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

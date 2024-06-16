import { type VariantProps, cva } from "class-variance-authority";
import React, { type InputHTMLAttributes } from "react";

export const checkboxVariants = cva(
  "flex items-center justify-center [&>div]:hidden [&>div]:peer-checked:block",
  {
    variants: {
      variant: {
        square:
          "w-4 h-4 rounded-[2.74px] border-[0.33px] border-[#D6D6D6] bg-[#E9E9EA] text-transparent peer-checked:bg-blue-500 peer-checked:border-[#0082D6] peer-checked:text-white",
        "rounded-white-dot-center":
          "h-[22px] w-[22px] rounded-full border-[1.2px] border-[#DBDBDB] peer-checked:border-blue peer-checked:bg-blue-500",
        "invisible-tick":
          "h-6 w-6 rounded-full text-transparent peer-checked:bg-blue-500 peer-checked:text-white",
        "invisible-tick-with-border":
          "h-6 w-6 rounded-full text-transparent border-[1.2px] border-[#DBDBDB] peer-checked:border-blue peer-checked:bg-blue-500 peer-checked:text-white",
        "invisible-tick-with-border-bg":
          "h-6 w-6 rounded-full text-transparent bg-white/20 border-[1.2px] border-[#DBDBDB] peer-checked:border-blue peer-checked:bg-blue-500 peer-checked:text-white",
      },
    },
    defaultVariants: {
      variant: "square",
    },
  }
);

interface Props
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof checkboxVariants> {
  classWrapper?: string;
}

export default function Checkbox({
  variant,
  className,
  classWrapper,
  ...props
}: Props) {
  return (
    <label className={classWrapper}>
      <input type="checkbox" className="peer hidden" {...props} />
      <span
        className={checkboxVariants({
          variant,
          className,
        })}
      >
        {variant === "square" ? (
          <svg
            width="10"
            height="9"
            viewBox="0 0 10 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.4972 4.84389L3.31748 7.27093C3.52447 7.54691 3.94215 7.53531 4.13351 7.24828L8.23009 1.10339"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ) : variant === "rounded-white-dot-center" ? (
          <div className="h-2 w-2 rounded-full bg-white"></div>
        ) : variant === "invisible-tick" ||
          variant === "invisible-tick-with-border" ||
          variant === "invisible-tick-with-border-bg" ? (
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.41844 6.00554L3.8016 9.18309C4.00859 9.45907 4.42627 9.44748 4.61763 9.16044L9.83999 1.3269"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </span>
    </label>
  );
}

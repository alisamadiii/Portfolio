import { cn } from "@/utils";
import React, {
  FC,
  HTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";

import { RxCaretSort } from "react-icons/rx";
import { BsCheck } from "react-icons/bs";

interface SelectProps extends HTMLAttributes<HTMLDivElement> {}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, ...props }) => {
    return <div className={cn("relative w-48", className)} {...props} />;
  }
);

Select.displayName = "Select";

type SelectContentProps = {
  placeholder: string;
  contents: string[];
  value: (a: any) => void;
  direction?: "top" | "bottom";
};

export function SelectContent({
  placeholder,
  contents,
  value,
  direction = "bottom",
}: SelectContentProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = useState<null | string>(null);

  const dropdownRef: any = useRef();

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    isOpen
      ? (document.body.style.overflow = "hidden")
      : (document.body.style.overflow = "");
  }, [isOpen]);

  return (
    <>
      <button
        className="flex items-center justify-between w-full gap-4 px-2 py-1 duration-150 border rounded focus:ring-1 ring-primary"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected ? selected : placeholder}
        <RxCaretSort />
      </button>
      {isOpen && (
        <ul
          className={`absolute w-full p-1 rounded-md shadow-xl bg-light-blue-2 ${
            direction == "top" ? "-translate-y-[107px]" : "translate-y-2"
          }`}
          ref={dropdownRef}
        >
          {contents.map((content, index) => (
            <li
              key={index}
              onClick={() => {
                setIsOpen(false);
                setSelected(content);
                value(content);
              }}
              className={`px-2 py-[2px] duration-100 rounded cursor-pointer hover:text-white hover:bg-dark-blue-2 flex items-center justify-between`}
            >
              {content}
              {content == selected && <BsCheck />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

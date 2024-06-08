import React from "react";
import {
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
} from "react-icons/md";

interface Props {
  onCloseHandler: () => void;
}

export default function Date({ onCloseHandler }: Props) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 items-center px-2">
        <button>
          <MdOutlineArrowBackIos />
        </button>
        <button>June</button>
        <div className="flex justify-end">
          <button className="">
            <MdOutlineArrowForwardIos />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 30 }).map((_, index) => (
          <button
            key={index}
            className="flex aspect-square items-center justify-center rounded-md text-center hover:bg-[#EAEAEA] active:bg-[#dcdcdc]"
            onClick={onCloseHandler}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

import { usePagePriceStore } from "@/context/PagePrice";
import React from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

type Props = {};

export default function PageCounter({}: Props) {
  const { pagePrice, setPagePrice } = usePagePriceStore();

  return (
    <div className="flex justify-center gap-1 my-8">
      <div className="flex items-center px-4 bg-white shadow-2xl rounded-l-xl">
        Page: {pagePrice}
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <button
          className="px-4 py-1 duration-150 bg-white shadow-2xl rounded-tr-xl focus:ring-2 ring-primary"
          onClick={() => {
            pagePrice > 7 ? setPagePrice(8) : setPagePrice(pagePrice + 1);
          }}
        >
          <IoIosArrowUp />
        </button>
        <button
          className="px-4 py-1 duration-150 bg-white shadow-2xl rounded-br-xl focus:ring-2 ring-primary"
          onClick={() => {
            pagePrice < 2 ? setPagePrice(1) : setPagePrice(pagePrice - 1);
          }}
        >
          <IoIosArrowDown />
        </button>
      </div>
    </div>
  );
}

import { ProductType } from "@/contents/Products";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { FiArrowUpRight } from "react-icons/fi";

type Props = {
  product: ProductType;
};

export default function Product({ product }: Props) {
  return (
    <Link
      href="#"
      className="relative flex flex-col overflow-hidden font-medium duration-150 bg-white group md:gap-8 md:items-center md:flex-row rounded-xl shadow-container"
    >
      <div className="relative">
        <Image
          src={product.image}
          width={1000}
          height={700}
          alt=""
          className="w-full md:max-w-[300px]"
        />
        <p
          className={`absolute top-2 left-2 px-2 rounded-sm backdrop-blur-sm ${
            product.price == "FREE"
              ? "bg-green-600/20 text-green-500 shadow-success"
              : "bg-orange-500/20 text-orange-500 shadow-warning"
          }`}
        >
          {product.price == "FREE" ? "FREE" : `$${product.price}`}
        </p>
      </div>
      <div className="p-4 space-y-3 md:p-0">
        <h3 className="text-xl font-bold md:text-2xl">{product.name}</h3>
        <p className="text-sm md:text-base">{product.description}</p>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <div className="space-x-4">
            {product.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-3 py-1 rounded-md bg-success/10 text-success"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute hidden text-6xl duration-300 opacity-0 xl:block -translate-y-1/3 right-8 top-1/2 group-hover:opacity-100 group-hover:-translate-y-1/2">
        <FiArrowUpRight />
      </div>
    </Link>
  );
}

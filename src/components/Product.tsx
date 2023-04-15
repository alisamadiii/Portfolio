import { ProductType } from "@/contents/Products";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {
  product: ProductType;
};

export default function Product({ product }: Props) {
  return (
    <Link
      href={product.link}
      target="_blank"
      className={`relative flex flex-col font-medium duration-150 group md:gap-8 md:items-center md:flex-row rounded-xl shadow-container ${
        product.valuable
          ? "bg-primary product text-white hover:bg-primary/90"
          : "bg-white hover:bg-light-blue-2"
      }`}
    >
      <div className="relative">
        <Image
          src={product.image}
          width={1000}
          height={700}
          alt=""
          className={`w-full md:max-w-[300px] ${
            product.valuable
              ? "md:rounded-l-xl rounded-tr-xl md:rounded-t-none"
              : "rounded-t-xl md:rounded-l-xl md:rounded-tr-none"
          }`}
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
                className={`inline-block px-3 py-1 rounded-md ${
                  product.valuable
                    ? "bg-white text-primary"
                    : " bg-success/10 text-success"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { ProductType } from "@/contents/Products";

type Props = {
  product: ProductType;
};

import { FiChevronDown } from "react-icons/fi";

export default function Product({ product }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="relative">
      <div className={`relative duration-200 ${isOpen && "p-4"}`}>
        <Image
          src={product.image}
          width={1270}
          height={720}
          alt=""
          className={`w-full ${isOpen && "rounded-t-3xl"} duration-200`}
        />
        <div
          className="absolute rounded-sm cursor-pointer bg-gray-200/80 backdrop-blur-sm top-4 right-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FiChevronDown className={`duration-200 ${isOpen && "rotate-180"}`} />
        </div>
        <div
          className="absolute px-1 text-sm font-medium text-white rounded-sm cursor-pointer bg-green-500/50 back backdrop-blur-sm top-4 left-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          {product.price == "FREE" ? "FREE" : `$${product.price}`}
        </div>
        <AnimatePresence>
          {isOpen == false && product.valuable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 px-6 py-2 font-medium text-white rounded-tr-md bg-primary/70 backdrop-blur-sm"
            >
              Popular
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto", transition: { type: "spring" } }}
            exit={{ height: 0 }}
            className="px-4"
          >
            <h3 className="text-xl font-medium">{product.name}</h3>
            <p className="mt-1 mb-3 text-sm">{product.description}</p>
            <a
              href={product.link}
              target="_blank"
              className="inline-block px-4 py-2 text-white rounded-md bg-gradient-to-tr from-primary to-secondary"
            >
              Buy Now
            </a>
            <div className="h-4"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

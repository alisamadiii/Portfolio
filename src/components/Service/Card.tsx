import React, { useState } from "react";
import { motion } from "framer-motion";

import { FRONT_END_SERVICE } from "@/contents/Service";
import { usePagePriceStore } from "@/context/PagePrice";
import Counter from "../AnimatedCounter";
import { Button } from "../Button";

type Props = {
  service: FRONT_END_SERVICE;
};

export default function Card({ service }: Props) {
  const { pagePrice } = usePagePriceStore();
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className="relative p-4 overflow-hidden bg-white rounded-lg isolate grow basis-72 shadow-container"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {isHover && (
        <motion.div
          layoutId={service.level.toString()}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.2 }}
          className="absolute bg-center bg-cover rounded-lg pointer-events-none -inset-12 bg-hero-background -z-10"
        />
      )}
      {/* image */}
      <div className="relative flex items-center justify-center rounded-lg shadow-md isolate aspect-video -z-20">
        <p className="text-2xl font-bold text-center capitalize">
          {service.job.join(" ").replaceAll(" ", " + ")}
        </p>
        {isHover == false && (
          <motion.div
            layoutId={service.level.toString()}
            className="absolute inset-0 bg-center bg-cover rounded-lg pointer-events-none bg-hero-background -z-10"
          />
        )}
      </div>
      {/* level & price */}
      <div className="flex justify-between my-3">
        <h3 className="text-2xl font-medium">Level {service.level}</h3>
        <div className="flex flex-col items-end">
          <div className="flex items-center text-2xl">
            $ <Counter value={service.price * pagePrice} />
          </div>
          <small className="text-xs opacity-70">single page</small>
        </div>
      </div>
      {/* description */}
      {/* <div>{service.description}</div> */}
      {/* jobs */}
      <div className="flex flex-col">
        <p className="flex items-center gap-3">
          Design{" "}
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              service.design ? "bg-green-600" : "bg-red-600"
            }`}
          />
        </p>
        <p className="flex items-center gap-3">
          Coding{" "}
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              service.coding ? "bg-green-600" : "bg-red-600"
            }`}
          />
        </p>
        <p className="flex items-center gap-3">
          Animation{" "}
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              service.animation ? "bg-green-600" : "bg-red-600"
            }`}
          />
        </p>
      </div>
      {/* Button */}
      <Button
        className="w-full mt-4"
        onClick={() =>
          window.open("https://wa.me/message/MNYH64MBHSXKN1")?.focus()
        }
      >
        Contact Me
      </Button>
    </div>
  );
}

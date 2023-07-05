import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { TESTIMONIAL_SERVICE } from "@/contents/Service";

import { AiFillStar } from "react-icons/ai";

type Props = {
  testimonial: TESTIMONIAL_SERVICE;
};

export default function Testimonial({ testimonial }: Props) {
  const [isClicked, setIsClicked] = useState(false);

  return (
    <div className="relative flex flex-col gap-3 p-4 overflow-hidden bg-white rounded-lg snap-start">
      {/* Client Details */}
      <div className="flex items-center gap-2">
        <Image
          src={testimonial.client_image}
          width={30}
          height={30}
          alt={`${testimonial.name} - image`}
          className="rounded-full"
        />
        <div className="flex flex-col text-sm">
          <h3 className="text-black">{testimonial.name}</h3>
          <small className="text-xs">{testimonial.headline}</small>
        </div>
      </div>
      {/* testimonial */}
      <div>
        <p className="font-medium">{testimonial.message}</p>
      </div>
      {/* star */}
      <div className="flex items-center text-2xl text-yellow-500">
        {/* @ts-ignore */}
        {[...Array(testimonial.star).keys()].map((_, index) => (
          <AiFillStar key={index} />
        ))}
      </div>
      <button className="text-start" onClick={() => setIsClicked(true)}>
        See More
      </button>
      {/* Project Image */}
      <AnimatePresence>
        {isClicked && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween" }}
            className="absolute inset-0 flex flex-col gap-4 p-4 overflow-y-auto bg-white/50 backdrop-blur-sm scroll-bar"
            onClick={() => setIsClicked(false)}
            title="click for closing"
          >
            {testimonial.project_image.map((image) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "tween" }}
              >
                <Image
                  src={image}
                  width={300}
                  height={200}
                  alt={`${testimonial.name} - Project`}
                  className="w-full rounded-lg"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

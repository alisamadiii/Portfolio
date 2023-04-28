import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import useMeasure from "react-use-measure";

import { EachTestimonialTypes } from "@/contents/Anilearn_Testimonial";

type Props = {
  testimonial: EachTestimonialTypes;
};

import { ImQuotesRight } from "react-icons/im";

export default function Each_Testimonial({ testimonial }: Props) {
  const [ref, { height }] = useMeasure();

  return (
    <motion.div
      key={testimonial.id}
      //   exit={{ opacity: 0, y: 20 }}
      className="relative w-full max-w-[700px] bg-white p-4 rounded-lg mx-auto my-8 shadow-xl overflow-hidden border"
    >
      <ImQuotesRight className="absolute -top-8 text-9xl right-4 opacity-10" />
      <div className="flex items-center gap-2">
        <Image
          src={testimonial.image}
          width={200}
          height={200}
          alt={testimonial.name}
          className="w-12 rounded-full"
        />
        <div>
          <h3 className="font-medium text-xl/4">{testimonial.name}</h3>
          {testimonial.headline && (
            <small className="opacity-80">{testimonial.headline}</small>
          )}
        </div>
      </div>
      <motion.p
        className="mt-3 italic text-center text-lg/8"
        initial={{ height: height, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ opacity: 0 }}
        ref={ref}
      >
        {testimonial.message}
      </motion.p>
    </motion.div>
  );
}

import HeadTag from "@/components/Head";
import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Testimonial({}: Props) {
  return (
    <>
      <HeadTag title="Testimonial" />
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h1 className="text-2xl font-bold text-center">coming soon...</h1>
      </motion.div>
    </>
  );
}

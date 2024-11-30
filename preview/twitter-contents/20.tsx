import React from "react";
import * as Element from "@/components/TwitterContentsElement";
import { motion } from "framer-motion";

export default function TwitterContent20() {
  const text = "Text Revealing Animation";

  return (
    <Element.Wrapper>
      <Element.Preview>
        <h1 className="text-4xl font-bold">
          {text.split("").map((char, index) => (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {char}
            </motion.span>
          ))}
        </h1>
      </Element.Preview>
    </Element.Wrapper>
  );
}

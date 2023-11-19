"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FrequentlyAskedQuestions } from "../lib/data";

type Props = {};

export default function FAQ({}: Props) {
  const [allTestimonials, setAllTestimonials] = useState(false);

  return (
    <>
      <motion.div
        className={`space-y-4 overflow-hidden [--height:700px] md:[--height:400px] ${
          !allTestimonials && "fade-out-faq"
        }`}
        initial={{ height: "var(--height)" }}
        animate={{ height: allTestimonials ? "auto" : "var(--height)" }}
        transition={{ duration: 0.3 }}
      >
        {FrequentlyAskedQuestions.map((question) => (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            key={question.id}
            className="space-y-2"
          >
            <p className="font-medium text-foreground">{question.question}</p>
            <p
              className="text-muted"
              dangerouslySetInnerHTML={{
                __html: question.answer
                  .replaceAll(
                    /@(\w+)/g,
                    '<span class="text-blue-700 font-bold">@$1</span>'
                  )
                  .replaceAll("@", ""),
              }}
            />
          </motion.div>
        ))}
      </motion.div>
      <button
        onClick={() => {
          setAllTestimonials(!allTestimonials);
        }}
        className={`absolute left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-background ${
          !allTestimonials && "-translate-y-12"
        }`}
      >
        {allTestimonials ? "show less" : "show more"}
      </button>
    </>
  );
}

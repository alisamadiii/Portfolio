"use client";

import React from "react";
import { motion } from "framer-motion";
import { FrequentlyAskedQuestions } from "../lib/data";

export default function FAQ() {
  return (
    <motion.div className={`space-y-4`}>
      {FrequentlyAskedQuestions.map((question) => (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
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
  );
}

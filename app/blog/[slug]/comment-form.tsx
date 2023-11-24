"use client";

import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import Balancer from "react-wrap-balancer";
import { motion, AnimatePresence } from "framer-motion";
import useMeasure from "react-use-measure";

import Badge from "@/app/components/badge";
import { MotionText } from "@/app/framer";
import { supabase } from "@/utils/supabase";

interface Props {
  slug: string;
}

export default function CommentForm({ slug }: Props) {
  const [inputField, setInputField] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [ref, { height }] = useMeasure();
  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputField.length === 0) return;

    const line = inputField.replace(/\n/g, "\\n");

    setIsLoading(true);

    await supabase.from("blog-comments").insert({ comment: line, slug });

    setInputField("");
    setIsLoading(false);
    setIsSuccess(true);
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "26px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputField]);

  return (
    <motion.div animate={{ height: height > 0 ? height : undefined }}>
      <div ref={ref} className="mt-8 flex flex-col">
        <Balancer className="text-3xl font-bold">Comment</Balancer>
        <Badge className="mb-5">Public Beta</Badge>
        <AnimatePresence mode="wait" initial={false}>
          {isSuccess ? (
            <motion.div
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              key={"message"}
              className="flex flex-col text-center"
            >
              <MotionText
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Badge className="mb-2 bg-green-600 text-white">
                  Sent Successfully
                </Badge>
              </MotionText>
              <MotionText
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Balancer className="text-2xl font-medium">
                  Thanks for your comment!
                </Balancer>
              </MotionText>
              <MotionText
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Balancer className="text-muted-3">
                  It&apos;s awaiting approval. Stay tuned!
                </Balancer>
              </MotionText>
              <MotionText
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <button
                  onClick={() => {
                    setIsSuccess(false);
                  }}
                  className="mt-3 rounded bg-foreground px-3 py-2 text-background"
                >
                  Comment again
                </button>
              </MotionText>
            </motion.div>
          ) : (
            <motion.form
              key={"form"}
              className="flex items-start gap-2"
              onSubmit={onSubmitHandler}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <textarea
                ref={textareaRef}
                placeholder="comment"
                className="grow resize-none overflow-hidden rounded border border-border bg-transparent p-2 outline-none transition-shadow duration-100 focus:shadow-input-focus"
                value={inputField}
                rows={1}
                onChange={(e) => {
                  setInputField(e.target.value);
                }}
              />
              <button className="rounded bg-foreground px-4 py-2 text-background">
                {isLoading ? "Sending..." : "Send"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

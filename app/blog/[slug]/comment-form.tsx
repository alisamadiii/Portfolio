"use client";

import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import Balancer from "react-wrap-balancer";
import { motion, AnimatePresence } from "framer-motion";
import useMeasure from "react-use-measure";

import Badge from "@/components/badge";
import { MotionText } from "@/app/framer";
import { submitCommentForm } from "@/app/action";
import { validEmail } from "@/utils";

interface Props {
  slug: string;
  blogImage: string;
}

export default function CommentForm({ slug, blogImage }: Props) {
  const [inputField, setInputField] = useState("");
  const [emailField, setEmailField] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [ref, { height }] = useMeasure();
  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "84px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputField]);

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log(emailField.length === 0 ? null : emailField);

    try {
      setIsLoading(true);

      const res = await submitCommentForm(
        inputField,
        slug,
        emailField.length === 0 ? null : emailField
      );

      if (res?.message === "sent") {
        setIsSuccess(true);
        setInputField("");
      }

      console.log("sending via email to Ali Reza");

      const sendingEmailRes = await fetch(
        `/api/comment-email?title=${slug}&comment=${inputField}&blog_image=${blogImage}&gmail=${emailField}`,
        {
          method: "GET",
        }
      );

      const dataRes = await sendingEmailRes.json();

      console.log(dataRes);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      animate={{ height: height > 0 ? height : undefined }}
      className="mt-8"
    >
      <div ref={ref} className="flex flex-col">
        <Balancer className="mb-4 text-3xl font-bold">Comment</Balancer>
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
              // action={formAction}
              onSubmit={onSubmitHandler}
              className="flex items-start gap-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex w-full flex-col">
                <input
                  type="email"
                  placeholder="email"
                  className="grow resize-none overflow-hidden rounded border border-border bg-transparent p-2 outline-none transition-shadow duration-100 placeholder:text-muted-2 focus:shadow-input-focus"
                  value={emailField}
                  onChange={(event) => setEmailField(event.target.value)}
                />
                <p className="mb-4 mt-2 max-w-96 text-xs text-muted-2">
                  {validEmail(emailField) || emailField.length === 0
                    ? "We'll use your email to notify you if there was an answer for your question, and we won't show it in public. (optional)"
                    : "At least write it in a correct way! haha"}
                </p>
                <textarea
                  ref={textareaRef}
                  placeholder="comment"
                  name="comment"
                  id="comment"
                  className="grow resize-none overflow-hidden rounded border border-border bg-transparent p-2 outline-none transition-shadow duration-100 placeholder:text-muted-2 focus:shadow-input-focus"
                  value={inputField}
                  rows={1}
                  onChange={(e) => {
                    setInputField(e.target.value);
                  }}
                />
              </div>
              <button
                className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
                aria-disabled={isLoading}
                disabled={!validEmail(emailField) && emailField.length > 0}
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

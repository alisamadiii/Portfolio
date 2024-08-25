import React, { FormEvent, useState } from "react";
import Image from "next/image";
import useMeasure from "react-use-measure";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { cn } from "@/utils";

type Props = {};

export default function HireMe({}: Props) {
  const [expand, setExpand] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const [ref, { height }] = useMeasure();

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsError(false);

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    setIsPending(true);

    const res = await fetch("/api/send", {
      method: "POST",
      body: JSON.stringify({
        firstName: formData.get("name"),
        email: formData.get("email"),
        description: formData.get("description"),
      }),
    });

    if (res.ok) {
      setIsSuccess(true);
    } else {
      setIsError(true);
    }

    setIsPending(false);
  };

  return (
    <motion.div
      animate={{ height: height > 0 ? height : undefined }}
      className="relative mt-10 overflow-hidden rounded-md border-wrapper"
    >
      <div ref={ref} className="flex flex-col items-center px-8 py-8">
        <div className="relative h-24 w-24 overflow-hidden rounded-full">
          <Image
            src={"/my-image.png"}
            fill
            alt="my-image"
            className="object-cover"
          />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          Hire me as a Front End Developer
        </h3>
        <p className="mt-2 text-center text-muted">
          I&apos;m a passionate Front End Developer with expertise in building
          dynamic and responsive web applications using modern technologies like
          React, Next.js, and Tailwind CSS. Let&apos;s collaborate to bring your
          ideas to life!
        </p>
        {!expand ? (
          <button
            key={"button"}
            className="mt-6 h-8 rounded-md bg-foreground px-4 text-background"
            onClick={() => {
              setExpand(true);

              setTimeout(() => {
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: "smooth",
                });
              }, 200);
            }}
          >
            Contact now
          </button>
        ) : !isSuccess ? (
          <motion.form
            key={"form"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-6 w-full"
            onSubmit={submitForm}
          >
            <h4 className="text-lg font-medium">Contact Form</h4>
            <Input name="email" />
            <Input name="name" />
            <Input name="description" />
            <div className="space-x-2">
              <button
                className="mt-6 h-8 rounded-md px-4"
                onClick={() => setExpand(false)}
              >
                Cancel
              </button>
              <button
                className={cn(
                  "mt-6 h-8 rounded-md bg-foreground px-4 text-background",
                  isError && "bg-red-600"
                )}
              >
                {isError ? "Try again" : isPending ? "Sending..." : "Send"}
              </button>
            </div>
          </motion.form>
        ) : (
          <div className="mt-8">
            <h4 className="text-lg font-medium">Thanks for your email!</h4>
            <p>I will message you ASAP.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Input({ name }: { name: string }) {
  const [position, setPosition] = useState(false);
  const [input, setInput] = useState("");

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
      <AnimatePresence initial={false}>
        <div className="h-7">
          {position && (
            <motion.span
              layoutId={name}
              className="inline-block text-sm capitalize"
            >
              {name}
            </motion.span>
          )}
        </div>
        <label className="relative inline-block w-full rounded-lg border-wrapper p-2 duration-200 focus-within:ring-2 focus-within:ring-foreground">
          {!position && (
            <motion.span
              layoutId={name}
              className="absolute inline-block capitalize text-muted"
            >
              {name}
            </motion.span>
          )}
          {name === "description" ? (
            <textarea
              rows={5}
              className="w-full bg-transparent outline-none"
              onFocus={() => setPosition(true)}
              onBlur={() => {
                if (input.length === 0) {
                  setPosition(false);
                }
              }}
              name={name}
              onChange={({ target }) => setInput(target.value)}
            />
          ) : (
            <input
              type="text"
              className="w-full bg-transparent outline-none"
              onFocus={() => setPosition(true)}
              onBlur={() => {
                if (input.length === 0) {
                  setPosition(false);
                }
              }}
              name={name}
              onChange={({ target }) => setInput(target.value)}
            />
          )}
        </label>
      </AnimatePresence>
    </MotionConfig>
  );
}

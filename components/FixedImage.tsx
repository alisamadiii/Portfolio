"use client";

import Image from "next/image";
import React, { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";

import { Text } from "./ui/text";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

export default function FixedImage() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const { isVisible, setIsVisible, expand, setExpand } = useSkillStore();

  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      setIsVisible(true);
    }
  }, [pathname]);

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
        companyName: formData.get("companyName"),
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
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          exit={{ opacity: 0, transform: "translateY(40px)" }}
          className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
        >
          <AnimatePresence>
            {expand ? (
              <motion.div
                key={`${expand.toString()}-form`}
                layoutId="form-wrapper"
                className="relative mb-4 w-72 overflow-hidden bg-natural-100 p-4 shadow-custom-card"
                style={{ borderRadius: 12 }}
              >
                {isSuccess ? (
                  <motion.div layout>
                    <Text
                      variant={"p2-b"}
                      className="text-center text-natural-700"
                    >
                      Email sent successfully
                    </Text>
                  </motion.div>
                ) : (
                  <>
                    <Text element="h3" variant={"h3"} className="mb-2">
                      Hire me!
                    </Text>
                    <Text variant={"p3-r"}>
                      If you&apos;re from a company or manage one, I&apos;m
                      ready to bring my skills and passion to your team.
                    </Text>
                    <form
                      onSubmit={submitForm}
                      className="mt-6 flex flex-col gap-2"
                    >
                      <Input name="name" placeholder="Name" required />
                      <Input
                        name="email"
                        placeholder="Email"
                        type="email"
                        required
                      />
                      <Input
                        name="companyName"
                        placeholder="Company name"
                        required
                      />
                      <Textarea
                        name="description"
                        placeholder="Message"
                        required
                      />
                      <Button
                        className="mt-2 w-fit"
                        variant={isError ? "destructive" : "default"}
                      >
                        {isError
                          ? "Try again"
                          : isPending
                            ? "Sending..."
                            : "Hire now"}
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>
            ) : (
              <MySkill key={`${expand.toString()}-skill`} />
            )}
          </AnimatePresence>
          <motion.button
            initial={{ opacity: 0, transform: "translateY(40px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.2 }}
            className="relative z-20 h-12 w-12 rounded-full"
            onClick={() => setExpand(!expand)}
          >
            <motion.div
              layoutId="form-wrapper"
              className="absolute -inset-0.5 bg-natural-200"
              style={{ borderRadius: 40 }}
            ></motion.div>
            <Image
              src={"/my-image.png"}
              fill
              alt="my-image"
              className="rounded-full"
            />
          </motion.button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const mySkills = [
  "Hire me - I know how to make animation.",
  "Hire me - I use Zustand for global management.",
  "Hire me - I use Framer-Motion for animating things.",
];

function MySkill() {
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSkillIndex((prevIndex) => (prevIndex + 1) % mySkills.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.2,
        type: "spring",
        bounce: 0,
        delay: 1,
        layout: { delay: 0 },
      }}
      className="origin-bottom-right overflow-hidden rounded-full rounded-br-none bg-natural-100 p-2"
      // style={{ width }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        key={currentSkillIndex.toString()}
      >
        <Text variant={"p2-b"} className="text-natural-700">
          {mySkills[currentSkillIndex]}
        </Text>
      </motion.div>
    </motion.div>
  );
}

interface SkillState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  expand: boolean;
  setExpand: (expand: boolean) => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  isVisible: true,
  setIsVisible: (visible) => set({ isVisible: visible }),
  expand: false,
  setExpand: (expand) => set({ expand }),
}));

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Text } from "./ui/text";

type Props = {
  isImage?: boolean;
};

export default function FixedImage({ isImage = true }: Props) {
  const [isForm, setIsForm] = useState(false);

  return (
    <AnimatePresence>
      {isImage ? (
        <motion.div
          exit={{ opacity: 0, transform: "translateY(40px)" }}
          className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-50"
        >
          {isForm ? (
            <motion.div
              layoutId="form-wrapper"
              className="w-72 h-96 mb-4 bg-natural-100 p-4 shadow-custom-card"
              style={{ borderRadius: 12 }}
            >
              <Text element="h3" variant={"h3"} className="mb-2">
                Hire me!
              </Text>
              <Text variant={"p3-r"}>
                If you&apos;re from a company or manage one, I&apos;m ready to
                bring my skills and passion to your team.
              </Text>
            </motion.div>
          ) : (
            <MySkill />
          )}
          <motion.button
            initial={{ opacity: 0, transform: "translateY(40px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.2 }}
            className="relative w-12 z-20 h-12 rounded-full"
            onClick={() => setIsForm(!isForm)}
          >
            <motion.div
              layoutId="form-wrapper"
              className="absolute -inset-0.5 bg-natural-100"
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
  "I know how to make animation.",
  "I use Zustand for global management.",
  "I use Framer-Motion for animating things.",
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
      className="rounded-full bg-natural-100 origin-bottom-right overflow-hidden rounded-br-none p-2"
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

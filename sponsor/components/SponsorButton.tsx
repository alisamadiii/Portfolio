import React, { useState } from "react";
import Button from "./Button";
import { SiGithubsponsors } from "react-icons/si";
import { AnimatePresence, motion } from "framer-motion";

type Props = {};

export default function SponsorButton({}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      variant={"primary"}
      onClick={() =>
        window.open("https://twitter.com/Ali_Developer05")?.focus()
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isHovered ? (
          <motion.p
            key={"dm"}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="hidden xl:block"
          >
            DM Now
          </motion.p>
        ) : (
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            key={"Sponsor"}
            className="hidden xl:block"
          >
            Sponsor
          </motion.p>
        )}
      </AnimatePresence>
      <SiGithubsponsors className="text-3xl xl:hidden" />
    </Button>
  );
}

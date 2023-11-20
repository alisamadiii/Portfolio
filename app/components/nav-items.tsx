import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

type Props = {
  path: string;
  name: string;
};

import Lottie, { LottieRefCurrentProps } from "lottie-react";
import home from "./home.json";

export const NavItems = ({ path, name }: Props) => {
  const [isPlay, setIsPlay] = useState(false);

  let usePathName = usePathname() || "/";

  if (usePathName.includes("/blog/")) {
    usePathName = "/blog";
  } else if (usePathName.includes("/service/")) {
    usePathName = "/service";
  }

  const isActive = path === usePathName;

  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    const lottie = ref.current;

    if (lottie) {
      isPlay ? lottie.play() : lottie?.pause();
    }
  }, [isPlay]);

  return (
    <Link
      href={path}
      className={`relative px-2 py-1 capitalize focus:text-white focus:outline-none ${
        isActive ? "text-white" : "text-muted"
      }`}
      onMouseOver={() => {
        setIsPlay(true);
        ref.current?.setDirection(1); // Set direction forward
      }}
      onMouseOut={() => {
        ref.current?.setDirection(-1); // Set direction backward to reset
        setIsPlay(true); // Set isPlay to true to play in reverse
      }}
    >
      {/* <Lottie animationData={home} color="white" loop={false} lottieRef={ref} /> */}
      <p>{name}</p>
      {isActive && (
        <motion.div
          layoutId="navItem"
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
          className="absolute bottom-0 left-0 h-px w-full bg-white"
        />
      )}
    </Link>
  );
};

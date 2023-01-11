import React from "react";
import { motion } from "framer-motion";

import Button from "../components/Button";

import Logo from "../assets/Logo.png";
import { ReactComponent as Cute_1 } from "../assets/Cube-1.svg";
import { ReactComponent as Cute_2 } from "../assets/Cube-2.svg";

function Home() {
  return (
    <div className="w-full h-screen 2xl:h-auto 2xl:py-24 flex justify-center items-center p-4">
      <div className="relative w-full max-w-[900px] flex flex-col items-center gap-4 md:gap-8 md:text-center">
        <motion.img
          animate={{ opacity: [0, 1], y: [30, 0], scale: [0.9, 1] }}
          transition={{ duration: 1 }}
          src={Logo}
          className="w-[100px] h-[100px] md:w-[120px] md:h-[120px]"
          alt=""
        />
        <motion.h1
          animate={{ opacity: [0, 1], y: [30, 0] }}
          transition={{ duration: 1.03 }}
          className="text-2xl md:text-4xl lg:text-5xl font-black mt-2 tracking-tighter lg:leading-[1.3] text-gradient">
          As a <span className="sub-text-gradient">front-end</span> developer, I
          specialize in building and maintaining the user interface of web
          applications.
        </motion.h1>
        <motion.h2
          animate={{ opacity: [0, 1], y: [30, 0] }}
          transition={{ duration: 1.06 }}
          className="text-sm md:text-lg lg:text-2xl space-grotesk text-light text-opacity-70">
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating interactive and visually appealing websites.
        </motion.h2>
        <Button />

        <Cute_1 className="hidden xl:block absolute top-1/2 -right-[200px] animate-bounce-slower" />
        <Cute_2 className="hidden xl:block absolute top-[100px] -left-[250px] animate-bounce-slow" />
      </div>
    </div>
  );
}

export default Home;

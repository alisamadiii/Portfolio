import React from "react";
import { motion } from "framer-motion";

import AboutIMG from "../assets/image_about.png";
import SectionGradient from "../components/Section-Gradient";

function About() {
  return (
    <div
      id="about"
      className="relative h-auto lg:h-screen 2xl:h-auto py-12 lg:py-0 2xl:py-24 flex justify-center px-4 lg:px-40 overflow-hidden">
      <SectionGradient />
      <div className="w-full max-w-[1536px] grid lg:grid-cols-2 items-center">
        <motion.div
          initial={{ opacity: 0, y: 200 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}>
          <h3
            className={`text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-6 duration-1000`}>
            About
          </h3>
          <p
            className={`text-sm md:text-lg lg:text-2xl space-grotesk duration-1000 delay-75`}>
            Hi, my name is Ali Reza and I am a web developer with over 2 years
            of experience in the field. I specialize in front-end development
            and have a strong background in ReactJS. I am always looking to
            learn and grow as a developer, and I am excited to work on new and
            challenging projects
          </p>
        </motion.div>
        <motion.img
          initial={{ opacity: 0, y: 200 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          src={AboutIMG}
          className="w-[466px] mx-auto"
          alt=""
        />
      </div>
    </div>
  );
}

export default About;

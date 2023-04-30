import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { Heading2 } from "@/components";
import Container from "@/layout/Container";

import MyImage from "@/assets/about.png";
import Skill from "@/components/Skill";

type Props = {};

// Icons
import { AiFillHtml5 } from "react-icons/ai";
import { IoLogoCss3, IoLogoJavascript } from "react-icons/io";
import { FaReact } from "react-icons/fa";
import { SiNextdotjs, SiFirebase, SiRedux } from "react-icons/si";
import { FiFigma } from "react-icons/fi";

export default function About({}: Props) {
  return (
    <Container className="flex flex-col gap-8">
      <Heading2>About</Heading2>
      <div className="grid gap-16 md:gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="space-y-2"
        >
          <h3 className="text-2xl font-bold">
            As a front-end developer, I specialize in building and maintaining
            the user interface of web applications.
          </h3>
          <p className="font-medium">
            Hi, my name is Ali Reza and I am a web developer with over 2 years
            of experience in the field. I specialize in front-end development
            and have a strong background in ReactJS. I am always looking to
            learn and grow as a developer, and I am excited to work on new and
            challenging projects
          </p>

          <div className="flex flex-wrap gap-4 !mt-8">
            <Skill technology="HTML" Icon={AiFillHtml5} />
            <Skill technology="CSS" Icon={IoLogoCss3} />
            <Skill technology="JavaScript" Icon={IoLogoJavascript} />
            <Skill technology="React.js" Icon={FaReact} />
            <Skill technology="Next.js" Icon={SiNextdotjs} />
            <Skill technology="Redux" Icon={SiRedux} />
            <Skill technology="Firebase" Icon={SiFirebase} />
            <Skill technology="Figma" Icon={FiFigma} />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.1 }}
          className="relative"
        >
          <Image
            src={MyImage}
            width={700}
            height={700}
            alt="my image"
            className="object-cover mx-auto h-72 w-96"
            priority={true}
          />
          <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-b from-transparent to-light-blue"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 12 }}
            transition={{ duration: 1 }}
            className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-t from-primary to-[#432e96]"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 12 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute w-32 h-32 rounded-full left-12 top-12 bg-gradient-to-t from-primary to-secondary -z-10"
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            whileInView={{ opacity: 1, scale: 1, rotate: -12 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute right-0 w-12 h-12 top-1/2 bg-gradient-to-t from-secondary to-[#c77935] rounded-md"
          ></motion.div>
        </motion.div>
      </div>
    </Container>
  );
}

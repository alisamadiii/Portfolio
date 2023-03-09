import HeadTag from "@/components/Head";
import { useEffect } from "react";
import { motion } from "framer-motion";

import {
  AiFillGithub,
  AiFillTwitterCircle,
  AiFillLinkedin,
} from "react-icons/ai";
import { FiArrowUpRight } from "react-icons/fi";

export default function Home() {
  useEffect(() => {
    const sendingData = async () => {
      const res = await fetch("/api/hello", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nameTesting: "Ali Reza" }),
      });

      console.log("send");

      const data = await res.json();
      console.log(data);
    };

    sendingData();
  }, []);
  return (
    <>
      <HeadTag title="Ali Reza" />
      <motion.main
        className="mt-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          As a front-end developer, I specialize in building and maintaining the
          user interface of web applications.
        </h1>
        <p className="my-4 text-lg tracking-tight opacity-95">
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating interactive and visually appealing websites.
        </p>
        <p className="mt-8 leading-8 opacity-95">
          Hi, my name is Ali Reza and I am a web developer with over 2 years of
          experience in the field. I specialize in front-end development and
          have a strong background in ReactJS. I am always looking to learn and
          grow as a developer, and I am excited to work on new and challenging
          projects
        </p>
        <div className="flex flex-wrap gap-4 text-[#525252] dark:text-slate-300 mt-8">
          <a
            href="https://github.com/AliReza1083"
            target={"_blank"}
            aria-label="Check out my GitHub profile"
            className="basis-[176px] p-4 text-2xl flex justify-between border-2 rounded-lg border-primary/40 hover:border-primary hover:bg-primary/30 dark:hover:bg-secondary/10 dark:border-secondary duration-100"
          >
            <AiFillGithub />
            <FiArrowUpRight />
          </a>
          <a
            href="https://twitter.com/Ali_Developer05"
            target={"_blank"}
            aria-label="Check out my Twitter profile"
            className="basis-[176px] p-4 text-2xl flex justify-between border-2 rounded-lg border-primary/40 hover:border-primary hover:bg-primary/30 dark:hover:bg-secondary/10 dark:border-secondary duration-100"
          >
            <AiFillTwitterCircle />
            <FiArrowUpRight />
          </a>
          <a
            href="https://www.linkedin.com/in/alireza17"
            target={"_blank"}
            aria-label="Check out my LinkedIn profile"
            className="basis-[176px] p-4 text-2xl flex justify-between border-2 rounded-lg border-primary/40 hover:border-primary hover:bg-primary/30 dark:hover:bg-secondary/10 dark:border-secondary duration-100"
          >
            <AiFillLinkedin />
            <FiArrowUpRight />
          </a>
        </div>
      </motion.main>
    </>
  );
}

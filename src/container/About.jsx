import React, { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

import AboutIMG from "../assets/image_about.png";
import SectionGradient from "../components/Section-Gradient";

function About() {
  const [active, setActive] = useState(false);
  const { ref: text, inView: isActive } = useInView();

  useEffect(() => {
    isActive == true && setActive(true);
  }, [isActive]);

  console.log(active);

  return (
    <div
      ref={text}
      id="about"
      className="relative h-auto lg:h-screen 2xl:h-auto py-12 lg:py-0 2xl:py-24 flex justify-center px-4 lg:px-40 overflow-hidden">
      <SectionGradient />
      <div className="w-full max-w-[1536px] grid lg:grid-cols-2 items-center">
        <div>
          <h3
            ref={text}
            className={`text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-6 duration-1000 ${
              active ? "opacity-1 translate-x-0" : "opacity-0 -translate-x-14"
            }`}>
            About
          </h3>
          <p
            className={`text-sm md:text-lg lg:text-2xl space-grotesk duration-1000 delay-75 ${
              active ? "opacity-1 translate-x-0" : "opacity-0 -translate-x-14"
            }`}>
            Hi, my name is Ali Reza and I am a web developer with over 2 years
            of experience in the field. I specialize in front-end development
            and have a strong background in ReactJS. I am always looking to
            learn and grow as a developer, and I am excited to work on new and
            challenging projects
          </p>
        </div>
        <img src={AboutIMG} className="w-[466px] mx-auto" alt="" />
      </div>
    </div>
  );
}

export default About;

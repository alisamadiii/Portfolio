import React, { useState, useContext, useEffect } from "react";
import { useInView } from "react-intersection-observer";

import { Navbar_Context } from "@/context/Navbar_Context";

export default function Home() {
  const [isMenu, setIsMenu] = useState<boolean>(false);
  const [isProjectInfo, setIsProjectInfo] = useState<boolean>(false);
  const { setIsButton } = useContext(Navbar_Context);

  const { ref, inView, entry } = useInView();

  useEffect(() => {
    inView == true ? setIsButton(false) : setIsButton(true);
  }, [inView]);

  return (
    <>
      <main>
        {/* Header */}
        <header className="w-full h-screen" ref={ref}></header>

        {/* About */}
        <section id="about" className="w-full h-screen"></section>

        {/* Projects */}
        <section id="projects" className="w-full h-screen"></section>

        {/* Blogs */}
        <section id="blogs" className="w-full h-screen"></section>

        {/* Testimonial */}
        <section id="testimonial"></section>
      </main>
    </>
  );
}

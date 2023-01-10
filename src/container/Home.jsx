import React from "react";

import Button from "../components/Button";

import Logo from "../assets/Logo.png";

function Home() {
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <div className="w-full max-w-[900px] flex flex-col items-center gap-8 text-center">
        <img src={Logo} width="141px" height="141px" alt="" />
        <h1 className="text-5xl font-black mt-2 tracking-tighter leading-[1.3] text-gradient">
          As a <span className="sub-text-gradient">front-end</span> developer, I
          specialize in building and maintaining the user interface of web
          applications.
        </h1>
        <h2 className="text-2xl space-grotesk text-light text-opacity-70">
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating interactive and visually appealing websites.
        </h2>
        <Button />
      </div>
    </div>
  );
}

export default Home;

import React, { useState } from "react";

export default function Home() {
  const [isMenu, setIsMenu] = useState<boolean>(false);
  const [isProjectInfo, setIsProjectInfo] = useState<boolean>(false);

  return (
    <>
      <main>
        {/* Header */}
        <header></header>

        {/* About */}
        <section id="about"></section>

        {/* Projects */}
        <section id="projects"></section>

        {/* Blogs */}
        <section id="blogs"></section>

        {/* Testimonial */}
        <section id="testimonial"></section>
      </main>
    </>
  );
}

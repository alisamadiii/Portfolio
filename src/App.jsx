import React from "react";

import { Navbar, BackgroundGradient } from "./components";
import { Home, About, Projects, Skills, Contact } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Home />
      <Skills />
      <BackgroundGradient />
      <About />
      <Projects />
      <Contact />
    </div>
  );
}

export default App;

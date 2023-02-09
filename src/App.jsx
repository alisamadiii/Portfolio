import React from "react";

import { Navbar, BackgroundGradient } from "./components";
import { Home, About, Projects, Skills, Contact } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden snap-y snap-mandatory snap-center">
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

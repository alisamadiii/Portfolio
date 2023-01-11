import React from "react";

import { Navbar, BackgroundGradient } from "./components";
import { Home, About, Projects, Skills } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Home />
      <Skills />
      <BackgroundGradient />
      <About />
      <Projects />
    </div>
  );
}

export default App;

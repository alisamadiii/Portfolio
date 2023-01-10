import React from "react";

import { Navbar, BackgroundGradient } from "./components";
import { Home, About } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Home />
      <BackgroundGradient />
      <About />
    </div>
  );
}

export default App;

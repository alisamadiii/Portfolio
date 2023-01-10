import React from "react";

import { Navbar, BackgroundGradient } from "./components";
import { Home } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Home />
      <BackgroundGradient />
    </div>
  );
}

export default App;

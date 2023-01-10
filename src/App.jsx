import React from "react";

import { Navbar } from "./components";
import { Home } from "./container";

function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Home />
    </div>
  );
}

export default App;

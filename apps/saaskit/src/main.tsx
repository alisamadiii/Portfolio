import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { TRPCReactProvider } from "@workspace/trpc/client";

import "./index.css";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TRPCReactProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TRPCReactProvider>
  </StrictMode>
);

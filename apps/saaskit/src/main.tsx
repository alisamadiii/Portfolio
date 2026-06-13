import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TRPCReactProvider } from "@workspace/trpc/client";

import "./index.css";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TRPCReactProvider>
      <App />
    </TRPCReactProvider>
  </StrictMode>
);

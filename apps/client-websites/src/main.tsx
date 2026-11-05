import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@workspace/ui/components/sonner";

import "./index.css";

import { ProjectPage } from "@/pages/project-page";
import { ProjectsPage } from "@/pages/projects-page";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/p/:slug" element={<ProjectPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" />
    </QueryClientProvider>
  </StrictMode>
);

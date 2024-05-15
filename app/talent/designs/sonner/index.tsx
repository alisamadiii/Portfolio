"use client";

import React from "react";
import { useToastStore } from "./toast.context";

export default function Sonner() {
  const { toast } = useToastStore();

  const handleClick = () => {
    // Add a default toast message
    toast.error(`This is a default toast message ${Math.random() * 200}`, {
      description: "asdflkasjdlf",
    });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="h-12 rounded-lg bg-black px-6 text-white duration-200 hover:bg-opacity-80 active:scale-[.98]"
      >
        Render a toast
      </button>
    </div>
  );
}

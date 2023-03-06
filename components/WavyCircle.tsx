import React from "react";

type Props = {};

export default function WavyCircle({}: Props) {
  return (
    <div
      className="absolute top-0 left-0 w-full h-full -z-10"
      style={{
        transformStyle: "preserve-3d",
        transform: "perspective(500px) rotateX(60deg)",
      }}
    >
      <span
        className="absolute inset-0 bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white"
        style={{ animationDelay: "0.9s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-2"
        style={{ animationDelay: "0.8s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-4"
        style={{ animationDelay: "0.7s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-6"
        style={{ animationDelay: "0.6s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-8"
        style={{ animationDelay: "0.5s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-10"
        style={{ animationDelay: "0.4s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-12"
        style={{ animationDelay: "0.3s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-14"
        style={{ animationDelay: "0.2s" }}
      ></span>
      <span
        className="absolute bg-transparent border-4 border-black rounded-full animate-wavy-circle opacity-5 dark:border-white inset-16"
        style={{ animationDelay: "0.1s" }}
      ></span>
    </div>
  );
}

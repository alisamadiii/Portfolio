import React from "react";

type Props = {};

export default function Projects({}: Props) {
  return (
    <div className="space-y-8">
      <a href="#" className="inline-block space-y-2">
        <h1 className="text-2xl font-bold">AniLearn.dev</h1>
        <p className="opacity-95">
          We provide the best content to learn something very easily. The visual
          descriptions of development principles that We create are very clear.
        </p>
      </a>
      <a href="#" className="inline-block space-y-2">
        <h1 className="text-2xl font-bold">Asakatsu</h1>
        <p className="opacity-95">
          A project where you can keep track of your goal&apos;s progress, and
          contribute to open source in the same time.
        </p>
      </a>
    </div>
  );
}

import React from "react";
import { IconType } from "react-icons";

type Props = {
  Icon: IconType;
  technology: string;
};

export default function Skill({ Icon, technology }: Props) {
  return (
    <div className="flex flex-col items-center group" role="skills">
      <span className="text-4xl">
        <Icon />
      </span>
      <span
        className={`absolute px-4 py-2 translate-y-10 bg-white font-medium border border-gray-300 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 duration-150 text-sm pointer-events-none`}
      >
        {technology}
      </span>
    </div>
  );
}

import React from "react";
import { motion, useAnimate } from "framer-motion";

import { FaXTwitter } from "react-icons/fa6";
import {
  FaFacebook,
  FaSnapchat,
  FaTiktok,
  FaInstagram,
  FaSlack,
  FaDiscord,
  FaLinkedin,
} from "react-icons/fa";
import { cn } from "@/utils";

export default function TechHoverAnimation() {
  return (
    <div className="w-full max-w-2xl">
      <div className="grid grid-cols-3">
        <EachTech icon={<FaFacebook />} className="border-r-0" />
        <EachTech icon={<FaSnapchat />} />
        <EachTech icon={<FaXTwitter />} className="border-l-0" />
      </div>
      <div className="grid grid-cols-2">
        <EachTech icon={<FaTiktok />} className="border-y-0" />
        <EachTech icon={<FaInstagram />} className="border-y-0 border-l-0" />
      </div>
      <div className="grid grid-cols-3">
        <EachTech icon={<FaSlack />} className="border-r-0" />
        <EachTech icon={<FaDiscord />} />
        <EachTech icon={<FaLinkedin />} className="border-l-0" />
      </div>
    </div>
  );
}

function EachTech({
  className,
  icon,
}: {
  className?: string;
  icon: React.ReactNode;
}) {
  const [scope, animate] = useAnimate();

  const onMouseEnter = () => {
    animate("div", {
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
    });
    animate(scope.current, { color: "white" });
  };
  const onMouseLeave = () => {
    animate("div", { clipPath: "polygon(0 0, 100% 0, 0 0, 0% 100%)" });
    animate(scope.current, { color: "black" });
  };

  return (
    <div
      ref={scope}
      className={cn(
        "relative isolate flex h-32 items-center justify-center border border-black text-3xl",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon}
      <motion.div
        initial={{ clipPath: "polygon(0 0, 100% 0, 0 0, 0% 100%)" }}
        className="absolute inset-0 -z-10 bg-black"
      />
    </div>
  );
}

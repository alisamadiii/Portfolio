"use client";

import { type Service } from "@/.contentlayer/generated";
import Image from "next/image";
import React, { useRef } from "react";
import readingTime from "reading-time";
import { motion, useScroll, useTransform } from "framer-motion";
import Balancer from "react-wrap-balancer";

interface Props {
  service: Service;
}

export default function BlogHeader({ service }: Props) {
  const blogHeaderRef = useRef<null | HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: blogHeaderRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <header>
      <div className="relative" ref={blogHeaderRef}>
        <Image
          src={service.image}
          width={1600}
          height={840}
          alt={service.title}
        />
        {service.keyboard && (
          <motion.aside
            style={{ opacity }}
            className="absolute bottom-0 left-0 flex w-full items-center justify-between pb-2 pr-3"
          >
            <div className="flex items-center divide-x-2 divide-border">
              {service.keyboard.map((key, index) => (
                <p key={index} className="px-3 text-sm">
                  {key}
                </p>
              ))}
            </div>
            <p className="text-xs text-muted-2">
              {readingTime(service.body.raw).text}
            </p>
          </motion.aside>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        <Balancer className="text-3xl font-bold">{service.title}</Balancer>
        <small className="text-muted-2"></small>
      </div>
    </header>
  );
}

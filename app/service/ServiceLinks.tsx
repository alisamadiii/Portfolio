"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { allServices } from "contentlayer/generated";
import Image from "next/image";

export default function BlogLinks() {
  return (
    <motion.ul layout className="gap-4 space-y-4 md:columns-2">
      {allServices.map((service, index) => (
        <motion.li key={index}>
          <Link
            href={`${service.slug}`}
            className={` group flex w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-background/10 p-0.5 outline-none backdrop-blur-sm duration-100 focus:border-foreground ${
              service.advance
                ? "border_animate after:bg-background hover:after:bg-box"
                : "border border-border hover:bg-box"
            }`}
          >
            <Image
              src={service.image}
              width={600}
              height={400}
              alt=""
              className="mb-2 aspect-video rounded-t-xl object-cover"
            />
            <div className="flex flex-col px-3 pb-2">
              <p className="text-xl font-bold">{service.title}</p>
              <small className="text-muted-2">{service.description}</small>
            </div>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { allServices } from "contentlayer/generated";
import Image from "next/image";

type Props = {};

export default function BlogLinks({}: Props) {
  return (
    <motion.ul layout className="gap-4 space-y-4 md:columns-2">
      {allServices.map((service, index) => (
        <motion.li key={index}>
          <Link
            href={`${service.slug}`}
            className="flex w-full flex-col overflow-hidden rounded-xl border border-border outline-none duration-100 hover:bg-box focus:border-foreground"
          >
            <Image
              src={service.image}
              width={600}
              height={400}
              alt=""
              className="mb-2 aspect-video object-cover"
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

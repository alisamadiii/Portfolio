"use client";

import React from "react";
import { motion } from "framer-motion";

import IphoneSimulator from "@/components/iphone-simulator";

export default function Day12() {
  return (
    <div>
      <IphoneSimulator theme="light">
        <div className="absolute inset-0 -z-10 w-full"></div>

        <motion.div className="px-4 text-black">
          <h2 className="mb-3 mt-3">Lorem Ipsum</h2>
          <div className="h-12 w-full rounded-lg bg-[#e3e3e3]"></div>
          <p className="mt-3 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Impedit
            pariatur distinctio tenetur explicabo saepe ipsa quas, corrupti
            inventore sed ullam quaerat numquam minima eos, aliquid temporibus
            ducimus hic. Quo, doloremque?
          </p>
          <p className="mt-2 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Expedita,
            enim blanditiis, illum deleniti architecto alias at reprehenderit
            tenetur voluptate soluta dolor nostrum harum mollitia aperiam ipsam.
            Quasi iusto consequuntur unde!
          </p>
          <h2 className="mb-3 mt-3">Lorem Ipsum</h2>
          <p className="mb-3 mt-3 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Impedit
            pariatur distinctio tenetur explicabo saepe ipsa quas, corrupti
            inventore sed ullam quaerat numquam minima eos, aliquid temporibus
            ducimus hic. Quo, doloremque?
          </p>
          <div className="h-12 w-full rounded-lg bg-[#e3e3e3]"></div>
          <p className="mt-2 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Expedita,
            enim blanditiis, illum deleniti architecto alias at reprehenderit
            tenetur voluptate soluta dolor nostrum harum mollitia aperiam ipsam.
            Quasi iusto consequuntur unde!
          </p>
          <h2 className="mb-3 mt-3">Lorem Ipsum</h2>
          <p className="mb-3 mt-3 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Impedit
            pariatur distinctio tenetur explicabo saepe ipsa quas, corrupti
            inventore sed ullam quaerat numquam minima eos, aliquid temporibus
            ducimus hic. Quo, doloremque?
          </p>
          <div className="h-12 w-full rounded-lg bg-[#e3e3e3]"></div>
          <p className="mt-2 text-xs text-black/50">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Expedita,
            enim blanditiis, illum deleniti architecto alias at reprehenderit
            tenetur voluptate soluta dolor nostrum harum mollitia aperiam ipsam.
            Quasi iusto consequuntur unde!
          </p>
        </motion.div>

        <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-b from-transparent to-black/20 blur-3xl backdrop-blur-sm"></div>
      </IphoneSimulator>
    </div>
  );
}

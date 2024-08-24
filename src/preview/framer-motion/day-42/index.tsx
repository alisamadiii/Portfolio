"use client";

import React, { useState } from "react";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";

import Wrapper from "@/components/designs/wrapper";
import { myImage } from "@/utils";
import IphoneSimulator from "@/components/iphone-simulator";

const images = [
  [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bmF0dXJlfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bmF0dXJlfGVufDB8fDB8fHwwz",
  ],
  [
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8bmF0dXJlfGVufDB8fDB8fHww",
  ],
];

export default function Day42() {
  const [selectedImage, setSelectedImage] = useState<null | string>(null);

  const onClickHandler = (value: null | string) => setSelectedImage(value);

  const y = useMotionValue(0);

  const opacity = useTransform(y, [-100, 0, 100], [0, 1, 0]);

  return (
    <Wrapper>
      <IphoneSimulator
        mainClassName="py-0"
        textColor={selectedImage ? "white" : "black"}
        backgroundImage="https://s2-ug.ap4r.com/image-aigc-article/seoPic/origin/c760a93722d17be2764d101ef31824a28259b463.jpg"
      >
        <MotionConfig transition={{ duration: 0.3, type: "spring", bounce: 0 }}>
          <div>
            <header
              className="sticky top-0 z-30 grid grid-cols-3 items-center bg-white/80 pb-2 pt-14 font-medium backdrop-blur-lg"
              style={{ borderTopLeftRadius: 52, borderTopRightRadius: 52 }}
            >
              <button className="flex w-12 items-center gap-1 pl-2 text-blue-500">
                <svg
                  viewBox="0 0 12 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3"
                  style={{ flex: "0 0 auto" }}
                >
                  <path
                    d="M10.5312 1.36963L2.1398 9.47206C2.07194 9.53759 2.07194 9.64633 2.1398 9.71186L10.5312 17.8143"
                    stroke="currentColor"
                    strokeWidth="2.66667"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="rounded-full bg-blue-500 px-1 py-0.5 text-xs text-white">
                  522
                </span>
              </button>

              <div className="flex grow flex-col items-center text-black">
                <h2>Ali Samadi</h2>
                <small className="-mt-1 inline-block text-xs font-light text-[#727472]">
                  699 subscribers
                </small>
              </div>

              <div className="flex justify-end pr-2">
                <button className="active:opacity-50">
                  <motion.img
                    src={myImage}
                    width={40}
                    height={40}
                    alt="my-image"
                    className="h-8 w-8 object-cover"
                    style={{ borderRadius: 16 }}
                  />
                </button>
              </div>

              <motion.div
                layoutId="buttons"
                className="pointer-events-none absolute bottom-0 left-0 z-10 mt-2 grid w-full grid-cols-4 gap-2"
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <button
                    key={index}
                    className="flex aspect-[8/6] w-full items-center justify-center rounded-lg bg-[#A2A2A4]/80 text-sm text-white opacity-0 backdrop-blur"
                  >
                    Button
                  </button>
                ))}
              </motion.div>
            </header>

            <motion.ul className="mt-3 flex h-[600px] flex-col gap-2 px-2">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="flex max-w-[300px] gap-px rounded-xl border border-white bg-white"
                >
                  {image.map((subImage) => (
                    <button
                      key={subImage}
                      className=""
                      onClick={() => onClickHandler(subImage)}
                    >
                      <motion.img
                        layoutId={subImage}
                        src={subImage}
                        className="h-full w-full object-cover"
                        style={{ borderRadius: 12 }}
                      />
                    </button>
                  ))}
                </div>
              ))}
            </motion.ul>

            <motion.footer className="sticky bottom-0 z-10 flex h-16 w-full justify-center rounded-b-[53px] bg-white pt-2 font-normal text-[#1172E7]">
              Mute
            </motion.footer>
          </div>

          {selectedImage ? (
            <div className="absolute inset-0 isolate z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 -z-10 bg-black"
                onClick={() => onClickHandler(null)}
                style={{ opacity }}
                transition={{ duration: 0.1 }}
              />

              <motion.img
                layoutId={selectedImage}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={1}
                src={selectedImage}
                className="w-full"
                onDrag={(event, info) => {
                  y.set(info.offset.y);
                }}
                onDragEnd={(event, info) => {
                  animate(y, 1);

                  if (info.offset.y > 200 || info.offset.y < -200) {
                    setSelectedImage(null);
                  }
                }}
              />
            </div>
          ) : null}
        </MotionConfig>
      </IphoneSimulator>
    </Wrapper>
  );
}

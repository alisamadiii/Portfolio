"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimate,
} from "framer-motion";

import IphoneSimulator from "@/components/iphone-simulator";

interface values {
  id: number;
  image: string;
}

const initialValues: values[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1579468118288-682e600b8565?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=3871&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1534951009808-766178b47a4f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const InesActiveCard = () => {
  const [targetData, setTargetData] = useState<values | null>(null);

  const [scope, animate] = useAnimate();

  const onClickHandler = (value: values) => {
    setTargetData(value);
  };

  const onCloseHandler = async () => {
    animate(".text-information", { opacity: 0 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    setTargetData(null);
  };

  return (
    <div>
      <IphoneSimulator>
        <div className="flex flex-col gap-4 px-4">
          <MotionConfig
            transition={{ duration: 0.8, type: "spring", bounce: 0 }}
          >
            {initialValues.map((value) => (
              <motion.div
                key={value.id}
                layoutId={value.id.toString()}
                className="cursor-pointer p-4"
                style={{ borderRadius: 6 }}
                onClick={() => onClickHandler(value)}
              >
                <motion.img
                  layoutId={`image-${value.id.toString()}`}
                  src={value.image}
                  className="aspect-square w-24 rounded-lg object-cover"
                />
                <motion.button
                  layoutId={`button-${value.id.toString()}`}
                  className="mt-2 h-8 rounded-md bg-white/10 px-4"
                >
                  <motion.span
                    layoutId={`span-${value.id.toString()}`}
                    className="inline-block"
                  >
                    Gain shares
                  </motion.span>
                </motion.button>
              </motion.div>
            ))}

            <AnimatePresence>
              {targetData && (
                <motion.div
                  ref={scope}
                  key={targetData.id}
                  layoutId={targetData.id.toString()}
                  className="absolute inset-0 flex flex-col bg-[#2d2d2d] px-4 pt-16"
                >
                  <div className="mb-4 text-sm text-white/70 hover:text-white">
                    <button onClick={onCloseHandler}>back</button>
                  </div>
                  <motion.img
                    layoutId={`image-${targetData.id.toString()}`}
                    src={targetData.image}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <motion.button
                    layoutId={`button-${targetData.id.toString()}`}
                    className="mt-2 h-12 w-full rounded-md bg-white/10 px-4"
                  >
                    <motion.span
                      layoutId={`span-${targetData.id.toString()}`}
                      className="inline-block"
                    >
                      Gain shares
                    </motion.span>
                  </motion.button>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-information flex grow flex-col pb-12 pt-8" // text-information will be used in onCloseHandler handler with animation
                  >
                    <h3>Lower the Trading fee for 24 hours</h3>

                    <p className="mt-4 text-xs text-white/70">
                      Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                      Non aliquid eligendi dicta temporibus totam numquam
                      doloremque! Temporibus commodi quasi cupiditate, sequi ea
                      numquam distinctio vel sit autem eius suscipit eveniet?
                    </p>

                    <button className="mt-auto h-12 w-full rounded-md bg-blue-600 transition-opacity hover:opacity-80 active:opacity-100">
                      Activate
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </MotionConfig>
        </div>
      </IphoneSimulator>
    </div>
  );
};

export default InesActiveCard;

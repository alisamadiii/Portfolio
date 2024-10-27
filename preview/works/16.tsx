import React, { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import IphoneSimulator from "@/components/IphoneSimulator";

export default function Works16() {
  const [isActive, setIsActive] = useState(false);

  return (
    <IphoneSimulator className="bg-natural-900 text-white [&_[data-top]]:bg-transparent">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) {
              setIsActive(true);
            } else if (info.offset.y < -100) {
              setIsActive(false);
            }
          }}
          className="absolute bottom-0 left-0 right-0 bg-white px-4 py-16 text-black"
          initial={{ height: "100%" }}
          animate={{
            height: isActive ? "50%" : "100%",
            borderRadius: isActive ? "20px 20px 0 0" : "0",
          }}
        >
          {!isActive && (
            <motion.h1
              layoutId="title"
              className="text-7xl font-bold tracking-tighter"
            >
              50%
            </motion.h1>
          )}
        </motion.div>

        {isActive && (
          <div className="px-4">
            <motion.h1
              layoutId="title"
              className="text-7xl font-bold tracking-tighter"
            >
              50%
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
            >
              <p>
                Lorem ipsum dolor sit amet consectetur, adipisicing elit. Porro
                praesentium ducimus maxime perspiciatis eligendi accusantium
                soluta. Aliquam sint blanditiis, amet temporibus eligendi
                aperiam reprehenderit consequuntur dicta laudantium beatae
                ratione rerum.
              </p>
            </motion.div>
          </div>
        )}
      </MotionConfig>
    </IphoneSimulator>
  );
}

import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValue,
  useTransform,
} from "framer-motion";

import IphoneSimulator from "@/components/IphoneSimulator";

type Props = {};

export default function CameraControl({}: Props) {
  const [isZooming, setIsZooming] = useState(false);

  const yValue = useMotionValue(0);

  const y = useTransform(yValue, [100, -100], [100, -100]);

  console.log(y);

  return (
    <IphoneSimulator className="overflow-visible">
      <div className="absolute left-0 top-0 -z-10 h-full w-full overflow-hidden rounded-[42px]">
        <motion.img
          animate={{ scale: isZooming ? 2 : 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0 }}
          src="https://images.unsplash.com/photo-1515266591878-f93e32bc5937?q=80&w=2592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <motion.button
        drag="y"
        dragConstraints={{ bottom: 0, top: 0 }}
        dragElastic={{ top: 0, bottom: 0 }}
        onDrag={(event, info) => {
          console.log(event);
          console.log(info.point.y);
          yValue.set(info.offset.y);
        }}
        className="absolute bottom-[154px] right-0 z-20 h-[135px] w-3 !translate-x-6 bg-red-600"
        onPointerDown={() => setIsZooming(true)}
        onPointerUp={() => setIsZooming(false)}
        onMouseLeave={() => setIsZooming(false)}
      ></motion.button>
      <MotionConfig transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}>
        <AnimatePresence>{isZooming && <ZoomElement y={y} />}</AnimatePresence>
      </MotionConfig>
    </IphoneSimulator>
  );
}

function ZoomElement({ y }: { y: any }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="absolute bottom-[130px] right-0 flex origin-right items-center justify-center overflow-hidden"
    >
      <svg width="0" height="0" xmlns="http://www.w3.org/2000/svg">
        <mask
          id="custom-mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="31"
          height="220"
        >
          <path
            d="M21.8187 12.8596V4.70615C21.8187 2.501 23.6063 0.713379 25.8114 0.713379C28.0166 0.713379 29.8042 2.501 29.8042 4.70615V214.641C29.8042 216.847 28.0166 218.634 25.8114 218.634C23.6063 218.634 21.8187 216.847 21.8187 214.641V209.223C21.8187 204.854 20.0834 200.665 16.9946 197.576L7.56506 188.147C3.6268 184.208 1.41431 178.867 1.41431 173.297V50.7669C1.41431 45.1973 3.62681 39.8559 7.56507 35.9176L15.593 27.8898C19.5792 23.9035 21.8187 18.497 21.8187 12.8596Z"
            fill="white"
          />
        </mask>
      </svg>

      <div
        className="h-[220px] w-[31px] translate-x-[10px] bg-black"
        style={{
          mask: "url(#custom-mask)",
          WebkitMask: "url(#custom-mask)",
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex h-full flex-col items-center justify-center gap-0.5"
          style={{ y }}
        >
          {Array.from({ length: 50 }).map((_, index) => (
            <div className="h-px w-2 rounded-full bg-[#4C4C4C] first-of-type:bg-white nth-child-6n:bg-white"></div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

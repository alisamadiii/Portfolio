import Image from "next/image";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { GrRotateRight } from "react-icons/gr";

import { useImagePreviewModal } from "@/hooks/useModals";

export default function ImagePreview() {
  const [show, setShow] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);

  const { image, setImage } = useImagePreviewModal();

  const onClickHandler = () => setImage(null);

  const onZoomClickHandler = (action: "increment" | "decrement") => {
    if (action === "increment") {
      setZoom(zoom + 0.5);
    } else if (action === "decrement") {
      setZoom(zoom - 0.5);
    }
  };

  const onRotateClickHandler = () => setRotate(rotate + 90);

  return (
    image && (
      <div className="fixed left-0 top-0 isolate z-20 flex h-full w-full items-center justify-center overflow-hidden p-12">
        <div
          className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-sm"
          onClick={onClickHandler}
        />
        <motion.div className="relative isolate flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-box">
          <motion.div
            drag
            dragMomentum={false}
            whileTap={{ cursor: "grabbing" }}
            className="cursor-grab"
            onDrag={() => setShow(false)}
            onDragEnd={() => setShow(true)}
          >
            <Image
              src={image}
              width={500}
              height={500}
              alt=""
              style={{ scale: zoom, rotate: `${rotate}deg` }}
              className="pointer-events-none rounded-lg object-cover shadow-xl duration-75"
            />
          </motion.div>
          <Image
            src={image}
            width={500}
            height={500}
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover blur-3xl grayscale-[50%]"
          />

          <AnimatePresence initial={false}>
            {show && (
              <motion.footer
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "tween" }}
                className="absolute bottom-0 left-0 flex h-24 w-full items-end gap-2 bg-gradient-to-b from-transparent to-background/50 p-4"
              >
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-muted duration-100 focus:bg-box disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onRotateClickHandler}
                >
                  <GrRotateRight />
                </button>
                <div className="flex h-7 items-center overflow-hidden rounded-md border border-muted">
                  <button
                    onClick={() => onZoomClickHandler("decrement")}
                    disabled={zoom === 1}
                    className="p-1 duration-100 focus:bg-box disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaMinus />
                  </button>
                  <button
                    onClick={() => onZoomClickHandler("increment")}
                    disabled={zoom === 2}
                    className="p-1 duration-100 focus:bg-box disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaPlus />
                  </button>
                </div>
              </motion.footer>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  );
}

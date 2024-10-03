import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import useMeasure from "react-use-measure";

const images = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fG1hbiUyMHVzZXJ8ZW58MHx8MHx8fDA%3D",
    name: "John",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fG1hbiUyMHVzZXJ8ZW58MHx8MHx8fDA%3D",
    name: "Michael",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8bWFuJTIwdXNlcnxlbnwwfHwwfHx8MA%3D%3D",
    name: "David",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1557862921-37829c790f19?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bWFuJTIwdXNlcnxlbnwwfHwwfHx8MA%3D%3D",
    name: "Robert",
  },
];

export default function Works13() {
  const [isOpen, setIsOpen] = useState(false);

  const [ref, { height }] = useMeasure();

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0.1 }}>
      <div className="flex h-96 w-full items-end">
        <AnimatePresence mode="popLayout">
          <motion.div
            animate={{ height: height === 0 ? undefined : height }}
            className="mx-auto w-full max-w-[300px] bg-natural-100 shadow-custom-card"
            style={{ borderRadius: 8 }}
          >
            <div ref={ref} className="relative overflow-hidden px-3 pb-3">
              <div className="mx-auto mb-2 mt-1 h-1 w-7 rounded-full bg-natural-300/50"></div>
              {/* Opened Element */}
              <AnimatePresence mode="popLayout">
                {isOpen && (
                  <motion.div
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2 overflow-hidden"
                    onClick={() => setIsOpen(false)}
                  >
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="flex items-center gap-2 last-of-type:mb-4"
                      >
                        <motion.div
                          key={image.id}
                          layoutId={`image-${image.id}`}
                          className="relative h-8 w-8 overflow-hidden rounded-full border border-natural-100"
                        >
                          <Image
                            src={image.url}
                            fill
                            alt="image"
                            objectFit="cover"
                          />
                        </motion.div>
                        <span className="text-sm">{image.name}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between">
                <div className="-space-y-[6px]">
                  <span className="text-xs text-natural-500">
                    Active Call - 04:16
                  </span>
                  <h2 className="text-lg font-semibold tracking-tighter">
                    Family
                  </h2>
                </div>
                <div
                  className="flex -space-x-4"
                  onClick={() => setIsOpen(true)}
                >
                  {images.map((image) => (
                    <motion.div
                      key={image.id}
                      layoutId={`image-${image.id}`}
                      className="relative h-8 w-8 overflow-hidden rounded-full border border-natural-100"
                    >
                      <Image
                        src={image.url}
                        fill
                        alt="image"
                        objectFit="cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

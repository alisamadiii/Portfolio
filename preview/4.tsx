import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";

const images = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8bmF0dXJlfGVufDB8fDB8fHww",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bmF0dXJlfGVufDB8fDB8fHww",
  },
  {
    id: 5,
    img: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 6,
    img: "https://images.unsplash.com/photo-1540206395-68808572332f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDd8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 7,
    img: "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
  },
];

export default function Work4() {
  return (
    <div className="flex flex-wrap items-start gap-4 px-4">
      <MotionConfig transition={{ duration: 0.8, type: "spring", bounce: 0 }}>
        {images.map((image) => (
          <EachImage key={image.id} image={image.img} id={image.img} />
        ))}
      </MotionConfig>
    </div>
  );
}

function EachImage({ image, id }: { image: string; id: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [{ width, height, y, x }, setBounds] = useState({
    width: 0,
    height: 0,
    y: 0,
    x: 0,
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div className="grow basis-32">
      <motion.div
        key={id}
        className="cursor-pointer"
        onClick={() => {
          setIsOpen(true);
        }}
        onMouseEnter={(event) => {
          const parentWrapper = document.querySelector(
            "#preview-container"
          ) as HTMLDivElement;

          console.log(parentWrapper);

          if (parentWrapper) {
            const parentBounds = parentWrapper.getBoundingClientRect();

            const {
              width,
              height,
              top: y,
              left: x,
            } = (event.target as HTMLElement).getBoundingClientRect();

            console.log(y - parentBounds.top);

            setBounds({
              width,
              height,
              y: y - parentBounds.top - (fullscreen ? 0 : 1),
              x: x - parentBounds.left - (fullscreen ? 0 : 1),
            });
          }
        }}
        animate={
          isOpen
            ? { opacity: 0, transition: { duration: 0 } }
            : { opacity: 1, transition: { delay: 0.75, duration: 0 } }
        }
      >
        <motion.div className="aspect-square w-full">
          <motion.img
            src={image}
            className="h-full w-full object-cover"
            style={{ borderRadius: 12 }}
            animate={isOpen ? { width, height } : {}}
          />
        </motion.div>
      </motion.div>

      <AnimatePresence initial={false} mode="popLayout">
        {isOpen && (
          <motion.div
            key={id}
            className="absolute inset-0 isolate z-50 flex h-full w-full items-center justify-center"
            style={{ borderRadius: 12 }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 -z-10 bg-white/80 backdrop-blur dark:bg-black/80"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="absolute mx-auto flex !max-h-[400px] items-center justify-center overflow-hidden"
              initial={{ width, height, left: x, top: y }}
              animate={{
                left: "auto",
                top: "auto",
                width: "50%",
                height: "auto",
              }}
              exit={{ width, height, left: x, top: y }}
              style={{ borderRadius: 12 }}
            >
              <motion.img src={image} className="h-full w-full object-cover" />

              <motion.div
                initial={{ y: "100%", filter: "blur(4px)" }}
                animate={{ y: 0, filter: "blur(0px)" }}
                exit={{ y: "100%", filter: "blur(4px)" }}
                className="absolute bottom-0 left-0 w-full bg-gradient-to-b from-transparent to-black/70 p-4 text-white"
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={
                      "https://pbs.twimg.com/profile_images/1796933077891231745/SQCEp_jD_400x400.jpg"
                    }
                    width={40}
                    height={40}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <h2>Ali Samadi</h2>
                </div>
                <p className="mt-2 line-clamp-2 text-sm opacity-55">
                  This time, I am not using layoutId for this animation, because
                  it did not solve one of my issue.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

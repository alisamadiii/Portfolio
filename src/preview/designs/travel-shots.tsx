import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/utils";

type Props = {};

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

export default function TravelShots({}: Props) {
  const [selectedImage, setSelectedImage] = useState<null | number>(null);

  return (
    <div className={cn("px-4", !selectedImage && "columns-3")}>
      <AnimatePresence mode="popLayout" initial={false}>
        {!selectedImage ? (
          images.map((image) => (
            <motion.div
              key={image.id}
              layoutId={image.id.toString()}
              className="mb-4 cursor-pointer overflow-hidden"
              style={{ borderRadius: 12 }}
              onClick={() => setSelectedImage(image.id)}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src={image.img}
                className="w-full object-cover"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              />
            </motion.div>
          ))
        ) : (
          <motion.img
            layoutId={selectedImage.toString()}
            src={images.find((image) => image.id === selectedImage)?.img}
            className="aspect-square w-full object-cover"
            onClick={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

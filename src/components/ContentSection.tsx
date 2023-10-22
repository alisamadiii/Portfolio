import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

import type { ContentCreationsType } from "@/lib/data";
import { Text } from "./ui/text";

interface Props {
  content: ContentCreationsType;
}

export default function ContentSection({ content }: Props) {
  const [scrollWidth, setScrollWidth] = useState(0);

  const carousalRef = useRef<null | HTMLDivElement>(null);
  const articleRef = useRef<null | HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: articleRef,
    offset:
      content.paragraphs.length > 5
        ? ["start start", "end start"]
        : ["start start", "center start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  useEffect(() => {
    const carousalSize = () => {
      const carousal = carousalRef.current;

      if (!carousal) return;

      setScrollWidth(carousal.scrollWidth - carousal.offsetWidth);
    };

    carousalSize();
  }, []);

  return (
    <motion.article ref={articleRef} className="space-y-8" style={{ opacity }}>
      <Text size={32} className="text-foreground">
        {content.question}
      </Text>
      <div className="space-y-6">
        {content.paragraphs.map((paragraph, index) => (
          <Text key={index} variant={"muted-lg"}>
            {paragraph}
          </Text>
        ))}
      </div>
      {content.images && (
        <motion.div
          className="flex gap-4"
          drag="x"
          dragConstraints={{ right: 0, left: -scrollWidth }}
          whileDrag={{ cursor: "grabbing" }}
          ref={carousalRef}
        >
          {content.images.map((image, index) => (
            <div key={index} className="h-44" style={{ flex: "0 0 auto" }}>
              <Image
                src={image}
                width={300}
                height={300}
                alt=""
                className="pointer-events-none h-full w-full rounded-xl"
              />
            </div>
          ))}
        </motion.div>
      )}
    </motion.article>
  );
}

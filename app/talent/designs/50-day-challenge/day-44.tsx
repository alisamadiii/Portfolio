"use client";

import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Lenis from "@studio-freight/lenis";

export default function Day44() {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const { scrollYProgress: scrollYProgress2 } = useScroll({
    target: containerRef2,
    offset: ["start end", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 100]);
  const yImage = useTransform(scrollYProgress2, [0, 1], [0, -100]);
  const yImage2 = useTransform(scrollYProgress2, [0, 1], [0, -300]);

  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: any) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  }, []);

  return (
    <div className="isolate w-full bg-box">
      <div ref={containerRef} className="h-[200dvh] w-full">
        <div className="flex h-dvh flex-col items-center justify-center">
          <h1 className="text-4xl font-medium">Scroll down</h1>
          <motion.div
            style={{ scale, y: 48 }}
            className="fixed -z-10 h-8 w-8 rounded-full bg-white"
          ></motion.div>
        </div>
      </div>

      <div
        ref={containerRef2}
        className="mx-auto mt-[-490px] max-w-7xl py-48 text-black"
      >
        <div className="grid grid-cols-2 gap-12">
          <div>
            <h1 className="mb-4 text-4xl font-bold">Lorem Ipsum</h1>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Eos harum
              a quos modi dicta fugit ut dolorum sapiente reiciendis impedit
              molestias eveniet iste provident temporibus dignissimos deserunt,
              delectus itaque velit? Minima itaque, modi incidunt deleniti,
              repellat iste pariatur ratione voluptatum ab vel optio distinctio
              facere dolorum velit quidem. Delectus, voluptas. Dolorum nesciunt
              commodi aliquam saepe ad quod tenetur corrupti eveniet. Laborum
              aspernatur labore, ratione a asperiores dignissimos debitis
              delectus, eligendi corporis minus, ducimus eius voluptas eum ea
              culpa numquam. Aut earum velit expedita. Labore delectus,
              architecto doloremque perferendis eveniet distinctio. Suscipit et
              similique dolorum excepturi facilis labore iusto consectetur
              ratione natus, delectus aliquid quae eos tempora temporibus ut
              consequatur vero adipisci iure doloremque blanditiis in quos
              dignissimos ducimus. Eligendi, architecto. Et eligendi animi earum
              suscipit non, beatae vel itaque cumque expedita qui, dolorum saepe
              voluptatibus voluptatum consectetur dolor iusto laudantium aliquid
              minus quam autem aut ducimus? Rem corporis laborum ipsa! Quaerat
              corporis inventore ipsam quam facilis architecto nisi sapiente
              labore velit porro voluptate nesciunt molestiae expedita iste
            </p>
          </div>

          <div className="flex gap-4">
            <motion.div style={{ y: yImage }} className="flex flex-col gap-4">
              <Image
                src={
                  "https://images.unsplash.com/photo-1502318217862-aa4e294ba657?q=80&w=2143&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
                width={800}
                height={800}
                alt=""
              />
              <Image
                src={
                  "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=3570&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
                width={800}
                height={800}
                alt=""
              />
            </motion.div>
            <motion.div style={{ y: yImage2 }} className="flex flex-col gap-4">
              <Image
                src={
                  "https://images.unsplash.com/photo-1504387103978-e4ee71416c38?q=80&w=3264&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
                width={800}
                height={800}
                alt=""
              />
              <Image
                src={
                  "https://images.unsplash.com/photo-1505506874110-6a7a69069a08?q=80&w=2893&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
                width={800}
                height={800}
                alt=""
              />
            </motion.div>
          </div>
        </div>

        <div className="h-dvh"></div>
      </div>
    </div>
  );
}

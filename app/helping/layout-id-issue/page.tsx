"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";

interface Item {
  id: number;
  name: string;
  email: string;
  cover: string;
}

const initialValues: Item[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john@doe.com",
    cover:
      "https://images.unsplash.com/photo-1484415063229-3d6335668531?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Ym9va3xlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 2,
    name: "Jane Doe",
    email: "jane@doe.com",
    cover:
      "https://images.unsplash.com/photo-1529590003495-b2646e2718bf?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGJvb2t8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: 3,
    name: "Jim Doe",
    email: "jim@doe.com",
    cover:
      "https://images.unsplash.com/photo-1510172951991-856a654063f9?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGJvb2t8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: 4,
    name: "Jill Doe",
    email: "jill@doe.com",
    cover:
      "https://images.unsplash.com/photo-1431608660976-4fe5bcc2112c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGJvb2t8ZW58MHx8MHx8fDA%3D",
  },
];

export default function Home() {
  const [selected, setSelected] = useState<Item | null>(null);

  return (
    <div className="px-4 py-8">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <div className="grid grid-cols-3 gap-2">
          {initialValues.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-neutral-100"
              style={{ borderRadius: 8 }}
              onClick={() => setSelected(item)}
            >
              <motion.div
                layoutId={`cover-${item.id}`}
                className="relative aspect-square w-full"
              >
                <Image
                  src={item.cover}
                  alt={item.name}
                  fill
                  objectFit="cover"
                />
              </motion.div>
              <div className="p-4 px-2 text-sm">
                <motion.h3
                  layoutId={`name-${item.id}`}
                  className="inline-block font-semibold"
                >
                  {item.name}
                </motion.h3>
                <motion.p
                  layoutId={`email-${item.id}`}
                  className="inline-block text-neutral-500"
                >
                  {item.email}
                </motion.p>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {selected && (
            <div
              className="fixed inset-0 isolate"
              onClick={() => setSelected(null)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-white/80 backdrop-blur"
              />

              <motion.div
                layoutId={`cover-${selected.id}`}
                className="relative aspect-square w-full"
              >
                <Image
                  src={selected.cover}
                  alt={selected.name}
                  fill
                  objectFit="cover"
                />
              </motion.div>
              <div className="mt-4 px-2">
                <motion.h3
                  layoutId={`name-${selected.id}`}
                  className="inline-block text-2xl font-semibold"
                >
                  {selected.name}
                </motion.h3>
              </div>
              <div className="px-2">
                <motion.p
                  layoutId={`email-${selected.id}`}
                  className="inline-block text-neutral-500"
                >
                  {selected.email}
                </motion.p>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 px-2 text-sm text-neutral-500"
              >
                Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                Tempora molestiae quam quasi ipsam aperiam sapiente beatae
                aliquid, doloremque nemo non, impedit accusantium harum dolores
                nostrum reprehenderit. Nobis, vero! Reiciendis, numquam?
                Voluptas dolor dolores minima excepturi nemo eligendi. Ipsa,
                facilis. Eum dolorum dicta porro repellat veniam at deserunt,
                harum rerum similique. Blanditiis velit minus numquam
                repellendus exercitationem! Hic aliquid natus commodi.
              </motion.p>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

"use client";

import React, { useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";

import IphoneSimulator from "@/components/iphone-simulator";
import { cn, myImage } from "@/utils";

interface InitialValueTypes {
  id: number;
  img: string;
  username: string;
  placeholder: string;
  time: string;
}

const initialValues: InitialValueTypes[] = [
  {
    id: 1,
    img: myImage,
    username: "Ali Reza",
    placeholder: "I can do it!",
    time: "4:48 AM",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bWFufGVufDB8fDB8fHww",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1557862921-37829c790f19?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bWFufGVufDB8fDB8fHww",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1581382575275-97901c2635b7?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bWFufGVufDB8fDB8fHww",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 5,
    img: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 6,
    img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8bWFufGVufDB8fDB8fHww",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 7,
    img: "https://images.unsplash.com/photo-1615109398623-88346a601842?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
  {
    id: 8,
    img: "https://plus.unsplash.com/premium_photo-1675129779582-d84b954f2397?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    username: "Irene Strong",
    placeholder:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nisi et quasi quisquam optio repellendus ipsam, atque culpa, iusto nobis eveniet consectetur? Vel dolore placeat laudantium corporis rerum ipsum eius illo?",
    time: "4:48 AM",
  },
];

const messages = [
  { from: 0, message: "How are you?" },
  { from: 1, message: "I am good thanks" },
  {
    from: 0,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
  {
    from: 0,
    message:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Facilis repellat voluptates totam excepturi omnis, necessitatibus dolorum quas est fugit quia ratione recusandae similique iure numquam, possimus molestias laboriosam a assumenda!",
  },
];

const buttons = [
  "Add to Contacts",
  "Add to Folder",
  "Mark as Unread",
  "Pin",
  "Mute",
  "Delete",
];

export default function Day40() {
  const [fade, setFade] = useState(true);

  return (
    <IphoneSimulator
      textColor="black"
      roundedCorners={false}
      topElements={{ left: fade, right: fade }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 -z-10 bg-white"></div>
      <div className="mt-4">
        {initialValues.map((value, index) => (
          <EachUser
            key={value.id}
            value={value}
            index={index}
            onFadeChange={() => setFade(!fade)}
          />
        ))}
      </div>
    </IphoneSimulator>
  );
}

function EachUser({
  value,
  index,
  onFadeChange,
}: {
  value: InitialValueTypes;
  index: number;
  onFadeChange: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const bind = useLongPress(() => {
    setIsOpen(true);
    onFadeChange();
  });

  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={ref}
        {...bind()}
        className="group flex w-full gap-3 text-start active:bg-gray-100"
      >
        <motion.div
          whileTap={{ scale: [1, 0.98, 0.98, 1] }}
          transition={{ duration: 0.4 }}
          className="flex w-full items-start gap-3 px-4 py-2"
        >
          <Image
            src={value.img}
            width={100}
            height={100}
            alt=""
            className="aspect-square w-12 self-center rounded-full object-cover"
          />
          <div className="grow -space-y-0.5">
            <h2 className="text-lg">{value.username}</h2>
            <p className="line-clamp-2 text-[13px] leading-4 text-[#979597]">
              {value.placeholder}
            </p>
          </div>
          <small className="text-[#979597]" style={{ flex: "0 0 auto" }}>
            {value.time}
          </small>
        </motion.div>
      </button>

      <MotionConfig
        transition={{ duration: 0.34, type: "spring", bounce: 0.3 }}
      >
        <AnimatePresence>
          {isOpen ? (
            <div className="absolute inset-0 isolate overflow-hidden px-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-[#BEBFC6]/10 backdrop-blur-md"
                onClick={() => {
                  setIsOpen(false);
                  onFadeChange();
                }}
              />

              <div className="pointer-events-none flex h-full w-full flex-col justify-end gap-4 pb-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  className="no-scrollbar pointer-events-auto aspect-square w-full overflow-auto rounded-xl bg-gray-100"
                  style={{
                    background:
                      "url(https://s2-ug.ap4r.com/image-aigc-article/seoPic/origin/c760a93722d17be2764d101ef31824a28259b463.jpg) center/cover no-repeat",
                    transformOrigin: `100px ${-100 * -index}px`,
                  }}
                >
                  <header className="sticky top-0 grid h-12 grid-cols-3 items-center rounded-t-xl bg-white/70 px-2 backdrop-blur">
                    <div></div>
                    <div className="flex flex-col -space-y-1 text-center">
                      <h3 className="font-medium">{value.username}</h3>
                      <small className="inline-block text-[#979597]">
                        last seen recently
                      </small>
                    </div>
                    <Image
                      src={value.img}
                      width={100}
                      height={100}
                      alt=""
                      className="ml-auto aspect-square w-10 self-center rounded-full object-cover"
                    />
                  </header>

                  <ul className="mt-3 flex flex-col px-2">
                    {messages.map((message, index) => (
                      <li
                        key={index}
                        className={cn(
                          "mb-2 flex w-fit max-w-[250px] flex-col rounded-lg p-2 pb-0.5 text-sm",
                          message.from === 0
                            ? "bg-white"
                            : "self-end bg-blue-500 text-white"
                        )}
                      >
                        {message.message}
                        <small className="self-end opacity-50">4:00 AM</small>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  className="pointer-events-auto ml-auto flex w-52 origin-bottom flex-col rounded-xl bg-white shadow-2xl"
                >
                  {buttons.map((button) => (
                    <button
                      key={button}
                      className="h-10 border-b px-4 text-start"
                    >
                      {button}
                    </button>
                  ))}
                </motion.div>
              </div>
            </div>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </>
  );
}

import React, { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import IphoneSimulator from "@/components/IphoneSimulator";
import { cn } from "@/lib/utils";
import { CheckSquare, FolderKanban } from "lucide-react";
import { Smartphone } from "lucide-react";
import { NavigatingDrag } from "@/components/NavigatingClick";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const todosData: Todo[] = [
  {
    id: 1,
    title: "Grocery shopping",
    completed: false,
  },
  {
    id: 2,
    title: "Team presentation",
    completed: true,
  },
  {
    id: 3,
    title: "Health check-up",
    completed: false,
  },
  {
    id: 4,
    title: "Car maintenance",
    completed: true,
  },
  {
    id: 5,
    title: "Pay bills",
    completed: false,
  },
  {
    id: 6,
    title: "Call mom",
    completed: false,
  },
];

export default function Works16() {
  const [isActive, setIsActive] = useState(false);

  return (
    <IphoneSimulator className="bg-natural-900 text-white [&_[data-top]]:bg-transparent">
      <NavigatingDrag direction="down" className="items-start pt-40" />
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0 }}>
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={isActive ? 0 : 0.1}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) {
              setIsActive(true);
            } else if (info.offset.y < -100) {
              setIsActive(false);
            }
          }}
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-white px-4 py-16 text-black",
            isActive && "py-8"
          )}
          initial={{ height: "100%" }}
          animate={{
            height: isActive ? "50%" : "100%",
            borderRadius: isActive ? "20px 20px 0 0" : "0",
          }}
        >
          {!isActive && (
            <motion.h1
              layoutId="title"
              className="mb-8 flex items-center text-5xl font-bold tracking-wide"
            >
              {todosData.filter((todo) => todo.completed).length}/
              {todosData.length}
              <span className="ml-auto flex flex-col items-end text-xs tracking-tight text-natural-400">
                <span className="text-lg">Nov 10</span>
                <span className="-mt-1">Sunday</span>
              </span>
            </motion.h1>
          )}
          <motion.div layout className="flex flex-col">
            {todosData.map((todo) => (
              <div
                key={todo.id}
                className="flex h-10 w-full items-center gap-2"
              >
                <button className="flex h-4 w-4 items-center justify-center rounded-sm border border-natural-300 bg-natural-200 text-natural-600">
                  {todo.completed && (
                    <svg
                      viewBox="0 0 26 31"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-[8px]"
                    >
                      <path
                        d="M2.25781 13.903L6.2995 27.8624C6.54178 28.6992 7.66377 28.8476 8.11527 28.1026L23.9323 2.00293"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>

                {todo.title}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {isActive && (
          <div className="px-4">
            <motion.h1
              layoutId="title"
              className="flex items-center text-5xl font-bold tracking-wide"
            >
              {todosData.filter((todo) => todo.completed).length}/
              {todosData.length}
              <span className="ml-auto flex flex-col items-end text-xs tracking-tight text-natural-400">
                <span className="text-lg">Nov 10</span>
                <span className="-mt-1">Sunday</span>
              </span>
            </motion.h1>
            <motion.div
              initial={{ filter: "blur(4px)", y: -20 }}
              animate={{ filter: "blur(0px)", y: 0 }}
              className="mt-4"
            >
              <p className="text-natural-400">
                A good{" "}
                <span className="inline-flex items-center gap-1 text-2xl font-semibold text-white">
                  todo system <CheckSquare className="h-6 w-6" />
                </span>{" "}
                helps track tasks and set priorities.{" "}
                <span className="inline-flex items-center gap-1 text-2xl font-semibold text-white">
                  Digital todo apps <Smartphone className="h-6 w-6" />
                </span>{" "}
                make it easy to{" "}
                <span className="inline-flex items-center gap-1 text-2xl font-semibold text-white">
                  organize <FolderKanban className="h-6 w-6" />
                </span>{" "}
                and check off items as you complete them.
              </p>
            </motion.div>
          </div>
        )}
      </MotionConfig>
    </IphoneSimulator>
  );
}

import React, { useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
} from "framer-motion";
import { CircleCheck, Trash } from "lucide-react";

import IphoneSimulator from "@/components/IphoneSimulator";

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
    completed: false,
  },
  {
    id: 3,
    title: "Health check-up",
    completed: false,
  },
  {
    id: 4,
    title: "Car maintenance",
    completed: false,
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

export default function Works15() {
  const [todos, setTodos] = useState(todosData);
  const [show, setShow] = useState<number | null>(null);

  return (
    <IphoneSimulator className="bg-white">
      <h1 className="mb-8 mt-4 px-4 text-4xl font-bold tracking-tight">
        Todo List
      </h1>
      <div className="flex flex-col gap-2 px-4">
        <AnimatePresence>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              setTodos={setTodos}
              show={show}
              setShow={setShow}
            />
          ))}
        </AnimatePresence>
      </div>
    </IphoneSimulator>
  );
}

function TodoItem({
  todo,
  setTodos,
  show,
  setShow,
}: {
  todo: Todo;
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  show: number | null;
  setShow: (id: number | null) => void;
}) {
  const x = useMotionValue(0);

  return (
    <motion.div layout className="flex min-h-7 items-center gap-2">
      <motion.button
        className="flex h-4 w-4 items-center justify-center rounded-sm border border-natural-300 bg-natural-200 text-natural-600"
        style={{ x }}
        onClick={() => {
          setTodos((prev) =>
            prev.map((t) => (t.id === todo.id ? { ...t, completed: true } : t))
          );
          setShow(null);
        }}
      >
        {todo.completed && (
          <svg
            viewBox="0 0 26 31"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[8px]"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0 }}
              d="M2.25781 13.903L6.2995 27.8624C6.54178 28.6992 7.66377 28.8476 8.11527 28.1026L23.9323 2.00293"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </motion.button>
      <motion.p
        animate={{ opacity: todo.completed ? 0.3 : 1 }}
        transition={{ duration: 0.3 }}
        className="relative flex select-none items-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDrag={(e, info) => {
          if (show) setShow(null);

          x.set(decay(info.offset.x / 5, 30));
        }}
        onDragEnd={(e, info) => {
          if (info.offset.x > 50) {
            setTodos((prev) =>
              prev.map((t) =>
                t.id === todo.id ? { ...t, completed: true } : t
              )
            );
          } else if (info.offset.x < -20) {
            setTodos((prev) =>
              prev.map((t) =>
                t.id === todo.id ? { ...t, completed: false } : t
              )
            );
          }

          if (!todo.completed) {
            if (info.offset.x < -20) {
              setShow(todo.id);
            }
          }

          animate(x, 0);
        }}
      >
        {todo.title}
        <AnimatePresence>
          {todo.completed && (
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute left-0 inline-block h-px bg-black"
            ></motion.span>
          )}
        </AnimatePresence>
      </motion.p>
      <AnimatePresence initial={false}>
        {show === todo.id && (
          <div className="ml-auto flex items-center gap-px">
            <motion.button
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0 }}
              className="rounded-md p-1 transition-colors hover:bg-natural-150"
              onClick={() => {
                setTodos((prev) =>
                  prev.map((t) =>
                    t.id === todo.id ? { ...t, completed: true } : t
                  )
                );
                setShow(null);
              }}
            >
              <CircleCheck size={20} />
            </motion.button>
            <motion.button
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{
                duration: 0.5,
                type: "spring",
                bounce: 0,
                delay: show ? 0.05 : 0,
              }}
              className="rounded-md p-1 transition-colors hover:bg-natural-150"
              onClick={() => {
                setTodos((prev) => prev.filter((t) => t.id !== todo.id));
                setShow(null);
              }}
            >
              <Trash size={20} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function decay(value: number, max: number) {
  let entry = value / max;
  let sigmoid = 2 / (1 + Math.exp(-entry)) - 1;
  let exit = sigmoid * max;

  return exit;
}

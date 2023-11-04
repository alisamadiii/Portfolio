"use client";

import React, { type InputHTMLAttributes, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// import { Pricing } from "@/lib/data";
// import Price from "@/components/Price";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useContactStore } from "@/context/Contact.context";
import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";

import Image from "next/image";

// Icons
import { AiFillLock, AiOutlineGoogle } from "react-icons/ai";
import { RotatingLines } from "react-loader-spinner";

const imageContainerData = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?auto=format&fit=crop&q=80&w=1887&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Project 1",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Non alias veniam architecto aspernatur deserunt earum, quidem magni harum expedita fuga corrupti, quos repellendus fugit culpa in optio eos aliquam similique?",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&q=60&w=500&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGNvZGluZ3xlbnwwfHwwfHx8MA%3D%3D",
    title: "Project 2",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Non alias veniam architecto aspernatur deserunt earum, quidem magni harum expedita fuga corrupti, quos repellendus fugit culpa in optio eos aliquam similique?",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1536148935331-408321065b18?auto=format&fit=crop&q=60&w=500&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGNvZGluZ3xlbnwwfHwwfHx8MA%3D%3D",
    title: "Project 3",
    description:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Non alias veniam architecto aspernatur deserunt earum, quidem magni harum expedita fuga corrupti, quos repellendus fugit culpa in optio eos aliquam similique?",
  },
];

export default function Contact() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { name, setName, email, setEmail, page } = useContactStore();
  const { currentUser } = UseUserContext();

  useEffect(() => {
    currentUser && setEmail(currentUser.user.email);
    currentUser && setName(currentUser.user.user_metadata.full_name);
  }, [currentUser]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/service/building-website/contact`,
      },
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(
        (prevIndex) => (prevIndex + 1) % imageContainerData.length
      );
    }, 5000);

    return () => { clearInterval(interval); };
  }, []);

  return currentUser ? (
    <div className="grid h-screen grid-cols-3">
      {/* Image Container */}
      <section className="relative h-full overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ x: "100%" }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "-100%",
            }}
            transition={{ ease: "easeInOut", type: "tween", duration: 1 }}
            key={imageContainerData[currentIndex].id}
            className="absolute left-0 top-0 h-full w-full"
          >
            <Image
              src={imageContainerData[currentIndex].image}
              className="pointer-events-none h-full w-full select-none object-cover"
              width={300}
              height={300}
              alt=""
            />
            <motion.ul
              initial={{ y: "100%" }}
              animate={{ y: 0, transition: { delay: 1, type: "tween" } }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, type: "tween" }}
              className="absolute bottom-0 left-0 flex w-full flex-col justify-end gap-2 rounded-t-xl bg-background/70 p-4 text-white backdrop-blur-xl"
            >
              <motion.li
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.3 }}
              >
                <Text as="h2" size={32}>
                  {imageContainerData[currentIndex].title}
                </Text>
              </motion.li>
              <motion.li
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                <Text variant={"space-grotesk"} className="text-foreground">
                  {imageContainerData[currentIndex].description}
                </Text>
              </motion.li>
            </motion.ul>
          </motion.div>
        </AnimatePresence>
      </section>
      {/* Contact Form */}
      <section className="col-span-2 flex flex-col justify-center gap-12 px-12">
        <div className="flex w-full gap-6">
          <Input text="Your Name" placeholder={name} value={name} disabled />
          <Input
            text="Email"
            placeholder={email}
            value={email}
            disabled={true}
          />
        </div>
        <Input
          text="How many pages do you want to make?"
          placeholder="0"
          value={page}
          type="number"
        />
        <Input
          text="Your UI Design"
          placeholder="https://"
          type="url"
          comment="press ctrl+u for uploading file"
        />
        <Button className="self-start" disabled size={"lg"}>
          Under Construction
        </Button>
      </section>
    </div>
  ) : (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <RotatingLines
        strokeColor="white"
        strokeWidth="3"
        animationDuration="1"
        width="36"
        visible={true}
      />
      <Button variant={"google"} onClick={signInWithGoogle}>
        <AiOutlineGoogle className="text-2xl" /> Continue with Google
      </Button>
      <small>If the page is not responding, then you must be signed in.</small>
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  text: string;
  placeholder: string;
  opacity?: number;
  disabled?: boolean;
  comment?: string;
}

function Input({
  text,
  placeholder,
  opacity,
  disabled = false,
  comment,
  ...props
}: InputProps) {
  return (
    <label className="group relative w-full" style={{ opacity }}>
      <Text
        size={20}
        className="font-medium duration-200 group-focus-within:text-success"
      >
        {text}
      </Text>
      <div className="relative">
        <input
          type="text"
          className="w-full truncate border-b bg-transparent pb-4 pt-2 text-4xl text-white outline-none"
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
        <div className="absolute bottom-0 right-0 h-[0.5px] w-0 bg-white duration-200 group-focus-within:left-0 group-focus-within:w-full" />
      </div>
      {comment && (
        <Text size={12} className="mt-1">
          {comment}
        </Text>
      )}
      {disabled && (
        <div className="absolute right-4 top-1/2">
          <AiFillLock />
        </div>
      )}
    </label>
  );
}

// function Tab({ tabValue, tabState }: TabProps) {
//   const [status, setStatus] = useState<
//     "progress" | "not-progress" | "completed" | string
//   >("");

//   useEffect(() => {
//     tabValue === tabState
//       ? setStatus("progress")
//       : tabValue < tabState
//       ? setStatus("completed")
//       : setStatus("not-progress");
//   }, [tabState]);

//   return (
//     <motion.div
//       layout
//       initial={false}
//       animate={{
//         opacity: status === "completed" ? 1 : status === "progress" ? 0.8 : 0.2,
//       }}
//       transition={{ duration: 0.4 }}
//       className="relative isolate flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border"
//     >
//       <AnimatePresence>
//         {status === "completed" && (
//           <motion.div
//             initial={{ x: -100 }}
//             animate={{ x: 0 }}
//             exit={{ x: -100 }}
//             transition={{ type: "tween", duration: 0.3 }}
//             className="absolute left-0 top-0 -z-10 h-full w-full bg-success"
//           />
//         )}
//       </AnimatePresence>
//       <AnimatePresence mode="wait">
//         {status === "completed" ? (
//           <motion.span
//             initial={{ scale: 0 }}
//             animate={{
//               scale: 1,
//               transition: { type: "spring", stiffness: 100 },
//             }}
//             exit={{ scale: 0 }}
//             transition={{ duration: 0.2 }}
//             key={"completed"}
//             className="text-white"
//           >
//             <svg
//               width="24"
//               height="100%"
//               viewBox="0 0 14 14"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//             >
//               <motion.circle
//                 initial={{ pathLength: 0 }}
//                 animate={{ pathLength: 1 }}
//                 cx="7"
//                 cy="7"
//                 r="6.65"
//                 stroke="currentColor"
//                 strokeWidth="0.7"
//               />
//               <motion.path
//                 initial={{ pathLength: 0 }}
//                 animate={{ pathLength: 1 }}
//                 transition={{ delay: 0.3 }}
//                 d="M3 7L5.5 10L11 5"
//                 stroke="currentColor"
//                 strokeWidth="0.8"
//               />
//             </svg>
//           </motion.span>
//         ) : (
//           <motion.span
//             initial={{ scale: 0 }}
//             animate={{ scale: 1 }}
//             exit={{ scale: 0 }}
//             transition={{ duration: 0.2, type: "spring" }}
//             key={"not-completed"}
//           >
//             {tabValue}
//           </motion.span>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// }

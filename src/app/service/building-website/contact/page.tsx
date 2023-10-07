"use client";

import { Container } from "@/components/ui/container";
import React, { DragEvent, useEffect, useState } from "react";
import { AnimatePresence, Variants, motion } from "framer-motion";
import Compressor from "compressorjs";

import { Pricing } from "@/lib/data";
import Price from "@/components/Price";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useContactStore } from "@/context/Contact.context";
import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";

import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import DesignPage from "@/components/contact/design";
import Image from "next/image";

type Props = {};

const INITIAL_TABS = [1, 2, 3, 4, 5];

export default function Contact({}: Props) {
  const [tab, setTab] = useState(1);

  const { name, setName, email, setEmail, page, setPage, level, design } =
    useContactStore();
  const { currentUser } = UseUserContext();

  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      if (tab != 1) {
        e.preventDefault();
        e.returnValue = ""; // Some browsers require this line to display the confirmation dialog
      }
    };

    // Set up the beforeunload event handler
    window.onbeforeunload = handleBeforeUnload;

    // Clean up: Remove the event handler when the component unmounts
    return () => {
      window.onbeforeunload = null;
    };
  }, []);

  useEffect(() => {
    currentUser && setEmail(currentUser.user.email);
    currentUser && setName(currentUser.user.user_metadata.full_name);
  }, [currentUser]);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/service/building-website/contact`,
      },
    });
  };

  // page number
  const pageNumber = (action: "increase" | "decrease") => {
    if (action == "increase") {
      if (page == 20) return;
      setPage(page + 1);
    } else if (action == "decrease") {
      if (page == 1) return;
      setPage(page - 1);
    }
  };

  const enteringAnimation: Variants = {
    hidden: {
      opacity: 0,
      x: -30,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "tween",
        duration: 0.2,
      },
    },
  };

  return (
    <div className="h-screen overflow-auto bg-gradient-to-t from-accents-1 to-black">
      <Container
        size={"2xl"}
        className={`flex gap-12 pb-12 mt-20 md:mt-24 ${
          tab == 6 ? "flex-row items-center" : "flex-col items-start"
        }`}
      >
        <div
          className={`flex gap-4 md:gap-12 mb-12 ${
            tab == 6 && "justify-center flex-col"
          }`}
        >
          {INITIAL_TABS.map((tabValue) => (
            <Tab key={tabValue} tabValue={tabValue} tabState={tab} />
          ))}
        </div>
        {/* Tab 1 */}
        <AnimatePresence mode="wait">
          {tab == 1 ? (
            <motion.section
              key={1}
              variants={enteringAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full space-y-8"
            >
              <Text size={48} className="text-foreground">
                Which products do you want?
              </Text>
              <div className="flex flex-wrap w-full gap-6">
                {Pricing.map((price) => (
                  <Price key={price.id} price={price} />
                ))}
              </div>
            </motion.section>
          ) : tab == 2 ? (
            <motion.section
              key={2}
              variants={enteringAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full space-y-8"
            >
              <Text size={48} className="text-foreground">
                Your name
              </Text>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none"
              />
            </motion.section>
          ) : tab == 3 ? (
            <motion.section
              key={3}
              variants={enteringAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full space-y-8"
            >
              <Text size={48} className="text-foreground">
                Your email
              </Text>
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none"
              />
            </motion.section>
          ) : tab == 4 ? (
            <motion.section
              key={4}
              variants={enteringAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full space-y-8"
            >
              <Text size={48} className="text-foreground">
                How many pages do you want to make?
              </Text>
              <div className="flex items-center justify-between w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none">
                <Text size={20} className="font-normal">
                  <motion.span
                    initial={{ y: 4 }}
                    animate={{ y: 0 }}
                    className="inline-block"
                    key={page}
                  >
                    {page}
                  </motion.span>
                </Text>
                <div>
                  <IoIosArrowUp
                    className="cursor-pointer"
                    onClick={() => pageNumber("increase")}
                  />
                  <IoIosArrowDown
                    className="cursor-pointer"
                    onClick={() => pageNumber("decrease")}
                  />
                </div>
              </div>
            </motion.section>
          ) : tab == 5 ? (
            <motion.section
              key={5}
              variants={enteringAnimation}
              initial="hidden"
              animate="visible"
              className="w-full space-y-8"
            >
              {Pricing.find((price) => price.title == level)?.job.design ? (
                <Text size={48} className="text-success">
                  I will make the design :)
                </Text>
              ) : (
                <DesignPage />
              )}
            </motion.section>
          ) : (
            tab == 6 && (
              <motion.section key={6} className="w-full space-y-12 grow">
                <Text size={48} className="text-center text-foreground">
                  Review page
                </Text>
                <div className="w-full max-w-md p-8 mx-auto space-y-6 border rounded-xl bg-accents-1">
                  <div className="grid items-center grid-cols-2">
                    <Text size={24} className="text-foreground">
                      Name
                    </Text>
                    <Text>{name}</Text>
                  </div>
                  <div className="grid items-center grid-cols-2">
                    <Text size={24} className="text-foreground">
                      Email
                    </Text>
                    <Text>{email}</Text>
                  </div>
                  <div className="grid items-center grid-cols-2">
                    <Text size={24} className="text-foreground">
                      UI design
                    </Text>
                    <Text>{design.url}</Text>
                  </div>
                  <div className="grid items-center grid-cols-2">
                    <Text size={24} className="text-foreground">
                      Page
                    </Text>
                    <Text>{page}</Text>
                  </div>
                  <div className="flex h-32 gap-2 overflow-auto custom-scrollbar fade-out-review_page_files">
                    {design.files?.map((file, index) => (
                      <Image
                        key={index}
                        src={URL.createObjectURL(file)}
                        width={300}
                        height={600}
                        alt=""
                        className={`w-full h-full pointer-events-none rounded duration-200`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button size={"md"} onClick={() => setTab(tab - 1)}>
                      Edit
                    </Button>
                    <Button variant={"primary"} size={"md"}>
                      Send
                    </Button>
                  </div>
                </div>
              </motion.section>
            )
          )}
        </AnimatePresence>

        {tab !== 6 && (
          <div className="flex gap-4">
            <Button onClick={() => setTab(tab - 1)} disabled={tab == 1}>
              Prev
            </Button>
            {currentUser ? (
              <Button
                onClick={() => setTab(tab + 1)}
                disabled={
                  tab == 6 ||
                  (tab == 2 && name.length == 0) ||
                  (tab == 3 && !email.includes(".com")) ||
                  (tab == 5 && design.url?.length == 0)
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={signInWithGoogle}>Sign in to continue</Button>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

type TabProps = {
  tabValue: number;
  tabState: number;
};

function Tab({ tabValue, tabState }: TabProps) {
  const [status, setStatus] = useState<
    "progress" | "not-progress" | "completed" | string
  >("");

  useEffect(() => {
    tabValue == tabState
      ? setStatus("progress")
      : tabValue < tabState
      ? setStatus("completed")
      : setStatus("not-progress");
  }, [tabState]);

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        opacity: status == "completed" ? 1 : status == "progress" ? 0.8 : 0.2,
      }}
      transition={{ duration: 0.4 }}
      className="relative flex items-center justify-center w-12 h-12 overflow-hidden border rounded-full isolate"
    >
      <AnimatePresence>
        {status == "completed" && (
          <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            exit={{ x: -100 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="absolute top-0 left-0 w-full h-full bg-success -z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {status == "completed" ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              transition: { type: "spring", stiffness: 100 },
            }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            key={"completed"}
            className="text-white"
          >
            <svg
              width="24"
              height="100%"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.circle
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                cx="7"
                cy="7"
                r="6.65"
                stroke="currentColor"
                strokeWidth="0.7"
              />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
                d="M3 7L5.5 10L11 5"
                stroke="currentColor"
                strokeWidth="0.8"
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, type: "spring" }}
            key={"not-completed"}
          >
            {tabValue}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

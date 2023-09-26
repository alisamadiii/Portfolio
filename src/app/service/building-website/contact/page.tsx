"use client";

import { Container } from "@/components/ui/container";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Pricing } from "@/lib/data";
import Price from "@/components/Price";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useContactStore } from "@/context/Contact.context";
import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";

import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

type Props = {};

const INITIAL_TABS = [1, 2, 3, 4, 5];

export default function Contact({}: Props) {
  const [tab, setTab] = useState(1);

  const { name, setName, email, setEmail, page, setPage } = useContactStore();
  const { currentUser } = UseUserContext();

  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      if (tab == 2) {
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

  return (
    <Container
      size={"2xl"}
      className="flex flex-col items-start justify-center gap-12 min-h-[100dvh] max-md:mt-20"
    >
      <div
        className={`w-full flex gap-12 mb-12 ${tab == 6 && "justify-center"}`}
      >
        {INITIAL_TABS.map((tabValue) => (
          <Tab key={tabValue} tabValue={tabValue} tabState={tab} />
        ))}
      </div>
      {/* Tab 1 */}
      {tab == 1 && (
        <section className="w-full space-y-8">
          <Text size={48} className="text-foreground">
            Which products do you want?
          </Text>
          <div className="flex flex-wrap w-full gap-6">
            {Pricing.map((price) => (
              <Price key={price.id} price={price} />
            ))}
          </div>
        </section>
      )}

      {/* Tab2 */}
      {tab == 2 && (
        <section className="w-full space-y-8">
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
        </section>
      )}

      {/* Tab3 */}
      {tab == 3 && (
        <section className="w-full space-y-8">
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
        </section>
      )}

      {/* Tab4 */}
      {tab == 4 && (
        <section className="w-full space-y-8">
          <Text size={48} className="text-foreground">
            How many pages do you want to make?
          </Text>
          <div className="flex items-center justify-between w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none">
            <Text size={20} className="font-normal">
              {page}
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
        </section>
      )}

      {/* Tab5 */}
      {tab == 5 && (
        <section className="w-full space-y-8">
          <Text size={48} className="text-foreground">
            Your UI design
          </Text>
        </section>
      )}

      {/* Tab6 */}
      {tab == 6 && (
        <section className="w-full space-y-8">
          <Text size={48} className="text-foreground">
            Review page
          </Text>
        </section>
      )}

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
              (tab == 3 && !email.includes(".com"))
            }
          >
            Next
          </Button>
        ) : (
          <Button onClick={signInWithGoogle}>Sign in to continue</Button>
        )}
      </div>
    </Container>
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
      className="relative flex items-center justify-center w-12 h-12 overflow-hidden border rounded-full"
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
                stroke-width="0.7"
              />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
                d="M3 7L5.5 10L11 5"
                stroke="currentColor"
                stroke-width="0.8"
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

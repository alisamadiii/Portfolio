"use client";

import React, { type ChangeEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import TextShadow from "../../components/text-shadow";
import { sendingEmail } from "../action";

export default function Newsletter() {
  const [disable, setDisable] = useState(true);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    const validRegex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (value.toLocaleLowerCase().match(validRegex)) {
      setDisable(false);
    } else {
      setDisable(true);
    }
  };

  const onFormSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = event.target[0] as HTMLInputElement;

    setIsLoading(true);

    const { value } = target;

    const data = await sendingEmail(value);

    setMessage(data.message);

    if (data.message === "Joined") {
      const emailRes = await fetch(`/api/newsletter-verification?to=${value}`, {
        method: "POST",
      });

      if (emailRes.status === 200) {
        setEmailSuccess(true);
      }
    } else {
      console.log("no need");
    }

    // @ts-ignore
    event.target[0].value = "";
    setIsLoading(false);
  };

  return (
    <form
      onSubmit={onFormSubmitHandler}
      className="newsletter-grid-background fixed left-0 top-0 isolate z-50 flex h-full w-full flex-col items-center justify-center bg-background px-4 text-center"
    >
      <motion.div
        // @ts-ignore
        initial={{ "--x-background": "100%" }}
        // @ts-ignore
        animate={{ "--x-background": "-100%" }}
        transition={{
          repeatType: "loop",
          repeat: Infinity,
          //   repeatDelay: 0.5,
          type: "spring",
          stiffness: 40,
          damping: 40,
          mass: 2,
        }}
        className="testing absolute inset-0 -z-10 opacity-30"
        style={{
          background:
            "url(https://images.unsplash.com/photo-1512236258305-32fb110fdb01?q=80&w=2348&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D) center/cover",
        }}
      />
      <h1 className="text-3xl font-semibold">
        Join to my <TextShadow>newsletter</TextShadow>
      </h1>
      <p className="mt-2 font-light text-muted-2">
        Why not learn new things from me sometimes? haha
      </p>
      <input
        type="email"
        className="mt-4 h-12 w-full rounded-md bg-box px-4 outline-none duration-200 placeholder:text-muted-2 focus:shadow-[0_0_0_1px_white] md:max-w-96"
        placeholder="Email"
        onChange={onChangeHandler}
      />
      <button
        className="mt-4 h-12 w-full overflow-hidden rounded-md bg-white text-lg text-black duration-200 disabled:opacity-50 md:max-w-96"
        disabled={disable}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isLoading && message.length < 1 ? (
            <motion.p
              key={"join"}
              initial={{ y: 0 }}
              animate={{ y: 0 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "tween" }}
              className="inline-block"
            >
              Join
            </motion.p>
          ) : !isLoading && message.length > 1 ? (
            <motion.p
              key={"message"}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "tween" }}
              className="inline-block capitalize"
            >
              {message}
            </motion.p>
          ) : (
            <motion.p
              key={"sending..."}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "tween" }}
              className="inline-block"
            >
              Joining...
            </motion.p>
          )}
        </AnimatePresence>
      </button>

      {emailSuccess && (
        <p className="mt-4 text-white">Thanks for subscribing!</p>
      )}

      <button
        className="mt-8 text-muted-2 hover:text-white"
        onClick={() => history.back()}
      >
        Take me back!
      </button>
    </form>
  );
}

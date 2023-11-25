"use client";

import { supabase } from "@/utils/supabase";
import React, { type ChangeEvent, useState } from "react";
import { BarLoader } from "react-spinners";
import { AnimatePresence, motion } from "framer-motion";

const initialValues = {
  name: "",
  email: "",
};

export default function Form() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState({
    isLoading: false,
    emailExist: false,
    isError: false,
    isSuccess: false,
  });

  const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, name } = event.target;

    setValues({ ...values, [name]: value });
  };

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { name, email } = values;

    if (email === "" || name === "") return;

    setStatus({ ...status, isLoading: true });

    const { error } = await supabase
      .from("sending-emails")
      .insert({ email, name });

    setStatus({ ...status, isLoading: false });

    console.log(error);

    if (error?.code === "23505") {
      setStatus({ ...status, emailExist: true });
    } else {
      setStatus({ ...status, emailExist: false, isSuccess: true });
    }
  };

  console.log(values);

  const { isLoading, emailExist, isSuccess } = status;

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {!isSuccess ? (
          <motion.form
            key="form"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={onSubmitHandler}
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              placeholder="name"
              name="name"
              className="grow rounded border border-border bg-transparent p-2 outline-none duration-100 focus:shadow-input-focus"
              onChange={onChangeHandler}
            />
            <input
              type="email"
              placeholder="email"
              name="email"
              className="grow rounded border border-border bg-transparent p-2 outline-none duration-100 focus:shadow-input-focus"
              onChange={onChangeHandler}
            />
            <button className="flex h-10 items-center justify-center rounded bg-foreground px-4 py-2 text-background">
              {isLoading ? <BarLoader color="black" /> : "Continue"}
            </button>
            {emailExist && <p>Email already exits</p>}
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1>Thanks for waiting</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

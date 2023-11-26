"use client";

import React, { type ChangeEvent, useState } from "react";
import { BarLoader } from "react-spinners";
import { AnimatePresence, motion } from "framer-motion";
import { sendingEmail } from "@/app/action";
import { useFormState, useFormStatus } from "react-dom";

const initialValues = {
  name: "",
  email: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="flex h-10 items-center justify-center rounded bg-foreground px-4 py-2 text-background">
      {pending ? <BarLoader color="black" /> : "Continue"}
    </button>
  );
}

export default function Form() {
  const [values, setValues] = useState(initialValues);

  const [formState, formAction] = useFormState(sendingEmail, {
    message: "",
    error: undefined,
  });

  console.log(formState);

  const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, name } = event.target;

    setValues({ ...values, [name]: value });
  };

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {formState.message !== "sent" ? (
          <motion.form
            key="form"
            action={formAction}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              placeholder="name"
              name="name"
              className="grow rounded border border-border bg-transparent p-2 outline-none duration-100 focus:shadow-input-focus"
              required
              onChange={onChangeHandler}
            />
            <input
              type="email"
              placeholder="email"
              name="email"
              required
              className="grow rounded border border-border bg-transparent p-2 outline-none duration-100 focus:shadow-input-focus"
              onChange={onChangeHandler}
            />
            <SubmitButton />
            {formState.error === 23505 && <p>Email already exits</p>}
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

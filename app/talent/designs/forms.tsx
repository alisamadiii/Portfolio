"use client";

import React, { type HTMLAttributes } from "react";
import { type FieldError, useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { FcGoogle } from "react-icons/fc";
import { IoIosArrowForward } from "react-icons/io";

import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/utils";
import Link from "next/link";

const schema = z
  .object({
    username: z.string().min(3, "Add username"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(data.username), {
    message:
      "Username must contain only lowercase letters, digits, hyphens, or dots, with dots and hyphens placed between letters",
    path: ["username"],
  });

type formSchema = z.infer<typeof schema>;

export default function Forms() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<formSchema>({
    resolver: zodResolver(schema),
  });

  const onSubmit = () => {};

  return (
    <div className="w-full max-w-sm px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full flex-col items-center justify-center"
      >
        {/* <Logo className="md:hidden" /> */}
        <h2 className="mb-4 mt-6 font-bold">Sign up</h2>
        <input
          {...register("username")}
          className={
            "mb-2 h-[55px] w-full rounded-[16px] border border-transparent bg-[rgb(245,245,245)] p-4 text-[15px] outline-none placeholder:text-black/20 focus:border-[rgba(0,0,0,0.15)]"
          }
          placeholder="Username"
        />
        <ErrorMessageInput error={errors.username} />

        <input
          {...register("email")}
          className={
            "mb-2 h-[55px] w-full rounded-[16px] border border-transparent bg-[rgb(245,245,245)] p-4 text-[15px] outline-none placeholder:text-black/20 focus:border-[rgba(0,0,0,0.15)]"
          }
          placeholder="Email"
        />
        <ErrorMessageInput error={errors.email} />
        <input
          type="password"
          {...register("password")}
          className={
            "mb-2 h-[55px] w-full rounded-[16px] border border-transparent bg-[rgb(245,245,245)] p-4 text-[15px] outline-none placeholder:text-black/20 focus:border-[rgba(0,0,0,0.15)]"
          }
          placeholder="Password"
        />
        <ErrorMessageInput error={errors.password} />
        <button className="button-shrink focus:border-input-border/20 flex h-[56px] w-full items-center justify-center rounded-[16px] border border-none border-transparent bg-black text-[15px] font-medium text-white duration-100 duration-100 active:scale-[.99] disabled:opacity-50">
          {isSubmitting ? "Signing..." : "Sign up"}
        </button>
        {/* @ts-ignore */}
        <ErrorMessageInput error={errors.root} />
      </form>

      <div className="mt-4 flex w-full justify-center">
        <Link href={"#"} className="rounded text-[15px]">
          Forgot password
        </Link>
      </div>

      <div className="my-6 flex h-12 w-full items-center justify-center">
        <p className="absolute bg-white px-4 text-[15px] text-muted">or</p>
        <hr className="w-full border-[0.5px] border-[rgb(245,245,245)]" />
      </div>

      {/* Google */}
      <button className="grid h-[87px] w-full grid-cols-6 items-center justify-between rounded-2xl border border-[rgb(245,245,245)] pl-5 pr-3 duration-100 active:scale-[.99]">
        {/* Google */}
        <FcGoogle className="text-4xl" />
        <p className="col-span-4">Continue with Google</p>
        <div className="flex justify-end">
          <IoIosArrowForward />
        </div>
      </button>
    </div>
  );
}

type Props = HTMLAttributes<HTMLParagraphElement> &
  HTMLMotionProps<"p"> & {
    error: FieldError | undefined;
    message?: null | string;
    className?: string;
  };

export function ErrorMessageInput({
  error,
  className,
  message,
  ...props
}: Props) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn("w-full overflow-hidden", className)}
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-full px-4 text-xs text-red-500"
            {...props}
          >
            {message || error.message}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

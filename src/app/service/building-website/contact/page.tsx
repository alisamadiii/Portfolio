"use client";

import React, {
  type InputHTMLAttributes,
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";

// import { Pricing } from "@/lib/data";
// import Price from "@/components/Price";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useContactStore } from "@/context/Contact.context";
import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";

// Icons
import { AiOutlineGoogle } from "react-icons/ai";
import { RotatingLines } from "react-loader-spinner";
import { BiSolidLock } from "react-icons/bi";
import ImageItem from "./ImageItem";
import DraftButton from "./DraftButton";

type inputSelected = "name" | "email" | "page" | "url";

export default function Contact() {
  const [inputSelected, setInputSelected] = useState<inputSelected>("name");

  const { name, setName, email, setEmail, page, setPage, images, setImages } =
    useContactStore();
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

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    await supabase.from("contact-form").upsert(
      {
        userId: currentUser?.user.user_metadata.provider_id,
        email,
        name,
        page,
        status: "SENT",
      },
      { onConflict: "email" }
    );
  };

  const handleTabKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      event.preventDefault(); // Prevent the default tab behavior

      const inputs = document.querySelectorAll("#tab-form-page");
      const lastIndex = inputs.length - 1;

      // Find the index of the currently focused input
      const currentIndex = Array.from(inputs).findIndex(
        (input) => input === document.activeElement
      );

      // Set focus to the next or first input in the form
      const nextIndex = currentIndex < lastIndex ? currentIndex + 1 : 0;
      (inputs[nextIndex] as HTMLInputElement).focus();
    }
  };

  const uploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files) {
      setImages(files);
    }
  };

  useEffect(() => {
    const fetchingData = async () => {
      const { data } = await supabase
        .from("contact-form")
        .select("status")
        .eq("userId", currentUser?.user.user_metadata.provider_id);

      console.log(data);
    };

    fetchingData();
  }, []);

  return currentUser ? (
    <form
      onSubmit={onSubmitHandler}
      className="mx-auto min-h-screen max-w-xl border-l py-14"
    >
      <Text size={32} className="mb-11 pl-11 text-foreground">
        Contact Form
      </Text>

      <Input
        text="name"
        caption="Lorem ipsum dolor sit amet consectetur, adipisicing elit."
        inputSelected={inputSelected}
        setInputSelected={setInputSelected}
        onKeyDown={handleTabKey}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
      <Input
        text="email"
        caption="Lorem ipsum dolor sit amet consectetur, adipisicing elit."
        inputSelected={inputSelected}
        setInputSelected={setInputSelected}
        onKeyDown={handleTabKey}
        value={email}
        islocked={true}
      />
      <Input
        text="page"
        type="number"
        caption="Lorem ipsum dolor sit amet consectetur, adipisicing elit."
        inputSelected={inputSelected}
        setInputSelected={setInputSelected}
        onKeyDown={handleTabKey}
        value={page}
        onChange={(e) => {
          setPage(Number(e.target.value));
        }}
      />
      <label
        className="relative mb-9 flex w-full flex-col gap-3 pl-11"
        onClick={() => {
          setInputSelected("url");
        }}
      >
        {inputSelected === "url" && (
          <motion.div
            layoutId="blue-circle"
            transition={{ type: "tween" }}
            className={`absolute -left-[0.5px] -top-12 -z-10 flex h-32 w-px items-center justify-center bg-gradient-to-t from-transparent via-white/50 to-transparent before:absolute before:h-3 before:w-3 before:rounded-full before:bg-success`}
          />
        )}
        <div className="space-y-1">
          <Text size={24} className="capitalize text-foreground">
            Url
          </Text>
          <Text variant={"muted-sm"}>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit.
          </Text>
        </div>
        <div className="relative flex gap-2">
          <input
            name={"url"}
            className={`w-full rounded-xl bg-accents-1 px-3 py-2 text-foreground outline-none ring-1 ring-transparent duration-100 placeholder:capitalize placeholder:text-accents-4 focus:ring-success`}
            id="tab-form-page"
            placeholder={"url"}
            onFocus={() => {
              setInputSelected("url");
            }}
            autoComplete="off"
          />
          <label className="flex cursor-pointer items-center rounded-xl bg-foreground px-2 text-background">
            Upload
            <input
              type="file"
              className="hidden"
              onChange={uploadFiles}
              multiple
            />
          </label>
        </div>
        {images && (
          <div className="columns-2 gap-2 overflow-hidden rounded-lg">
            {Array.from(images).map((image, index) => (
              <ImageItem key={index} file={image} />
            ))}
          </div>
        )}
      </label>
      <div className="flex gap-2 pl-11">
        <DraftButton />
        <Button
          size={"md"}
          id="tab-form-page"
          onKeyDown={handleTabKey}
          type="button"
          disabled
        >
          Under Construction
        </Button>
      </div>
    </form>
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
  inputSelected: inputSelected;
  setInputSelected: (a: inputSelected) => void;
  text: inputSelected;
  caption: string;
  islocked?: boolean;
}

function Input({
  text,
  caption,
  disabled = false,
  inputSelected,
  setInputSelected,
  islocked = false,
  ...props
}: InputProps) {
  return (
    <label
      className="relative mb-9 flex w-full flex-col gap-3 pl-11"
      onClick={() => {
        setInputSelected(text);
      }}
    >
      {inputSelected === text && (
        <motion.div
          layoutId="blue-circle"
          transition={{ type: "tween" }}
          className={`absolute -left-[0.5px] -top-12 -z-10 flex h-32 w-px items-center justify-center bg-gradient-to-t from-transparent via-white/50 to-transparent before:absolute before:h-3 before:w-3 before:rounded-full ${
            islocked ? "before:bg-warning" : "before:bg-success"
          }`}
        />
      )}
      <div className="space-y-1">
        <Text size={24} className="capitalize text-foreground">
          {text}
        </Text>
        <Text variant={"muted-sm"}>{caption}</Text>
      </div>
      <div className="relative flex items-center">
        <input
          name={text}
          className={`w-full rounded-xl bg-accents-1 px-3 py-2 text-foreground outline-none ring-1 ring-transparent duration-100 placeholder:capitalize placeholder:text-accents-4 ${
            islocked ? "focus:ring-warning" : "focus:ring-success"
          }`}
          id="tab-form-page"
          placeholder={text}
          onFocus={() => {
            setInputSelected(text);
          }}
          autoComplete="off"
          {...props}
        />
        {islocked && (
          <div className="absolute right-4">
            <BiSolidLock />
          </div>
        )}
      </div>
    </label>
  );
}

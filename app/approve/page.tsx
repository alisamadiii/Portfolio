"use client";

import React, { type ChangeEvent, useState } from "react";
import Owner from "./Owner";

export default function ApprovePage() {
  const [isOwner, setIsOwner] = useState(false);
  const [passwordField, setPasswordField] = useState("");

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordField === process.env.NEXT_PUBLIC_PASSWORD) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  };

  return isOwner ? (
    <Owner />
  ) : (
    <form onSubmit={onSubmitHandler}>
      <h1 className="mb-5 text-3xl font-bold">Entry Password</h1>
      <input
        type="password"
        placeholder="password"
        className="mr-5 grow rounded border border-border bg-transparent p-2 outline-none duration-100 focus:shadow-input-focus"
        value={passwordField}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setPasswordField(event.target.value);
        }}
      />
      <button className="rounded bg-foreground px-4 py-2 text-background">
        Continue
      </button>
    </form>
  );
}

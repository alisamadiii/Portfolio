import React from "react";
import SendEmail from "./SendEmail";
import Link from "next/link";

export default function Newsletter() {
  return (
    <>
      <Link href={"/approve"}>Go back</Link>
      <SendEmail />
    </>
  );
}

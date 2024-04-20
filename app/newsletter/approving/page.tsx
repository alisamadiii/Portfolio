"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function NewsletterApproving() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const email = useSearchParams().get("email");

  useEffect(() => {
    async function approvingFunction() {
      if (email) {
        const res = await fetch(`/api/approve-newsletter?email=${email}`, {
          method: "POST",
        });

        const { response } = await res.json();

        setMessage(response);
      } else {
        console.log("dont run");
      }

      setIsLoading(false);
    }

    approvingFunction();
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full flex-col items-center justify-center bg-background">
      <h1>{isLoading ? "loading..." : message}</h1>
    </div>
  );
}

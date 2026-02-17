"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

export const PreviousCustomerBanner = () => {
  const trpc = useTRPC();
  const customer = useQuery(trpc.previousCustomer.get.queryOptions());

  if (!customer.data) return null;

  return (
    <div className="bg-primary/90 text-primary-foreground fixed top-0 z-50 flex w-full items-center justify-center px-8 py-4 shadow-lg backdrop-blur-sm">
      <p className="max-w-xl text-center">
        Thank you for purchasing our product in the past. We have updated our
        website and services. You can now use this code{" "}
        <span className="font-bold">{customer.data.code}</span> to purchase for{" "}
        <span className="font-bold">FREE</span>. The code is one time use only.
      </p>
    </div>
  );
};

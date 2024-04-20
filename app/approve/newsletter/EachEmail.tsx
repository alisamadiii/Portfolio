import { type Database } from "@/database.types";
import React from "react";

interface Props {
  email: Database["public"]["Tables"]["newsletter"]["Row"];
}

export default function EachEmail({ email }: Props) {
  return (
    <li className="mb-1 flex items-center gap-3 text-muted-3">
      <div
        className={`h-2 w-2 rounded-full ${email.verified ? "bg-green-600" : "bg-red-600"}`}
      />
      <p>{email.email}</p>
    </li>
  );
}

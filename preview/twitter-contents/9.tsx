import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import * as Element from "@/components/TwitterContentsElement";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function TwitterContents9() {
  const [password, setPassword] = useState("");

  return (
    <Element.Wrapper>
      <Element.Preview className="max-h-96 justify-start">
        <Input value={password} onChange={(e) => setPassword(e.target.value)} />
        <ul className="w-full space-y-2">
          <li className="flex items-center gap-2 text-sm text-natural-700">
            <Check key="length" valid={password.length >= 8} /> At least 8
            characters long
          </li>
          <li className="flex items-center gap-2 text-sm text-natural-700">
            <Check key="uppercase" valid={/[A-Z]/.test(password)} /> Contains at
            least one uppercase letter
          </li>
          <li className="flex items-center gap-2 text-sm text-natural-700">
            <Check key="lowercase" valid={/[a-z]/.test(password)} /> Contains at
            least one lowercase letter
          </li>
          <li className="flex items-center gap-2 text-sm text-natural-700">
            <Check key="number" valid={/[0-9]/.test(password)} /> Contains at
            least one number
          </li>
          <li className="flex items-center gap-2 text-sm text-natural-700">
            <Check key="special" valid={/[!@#$%^&*]/.test(password)} />
            Contains at least one special character
          </li>
        </ul>
      </Element.Preview>
    </Element.Wrapper>
  );
}

function Check({ valid }: { valid: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block h-4 w-4 rounded-full border border-natural-300",
        valid && "border-green-400"
      )}
    >
      <AnimatePresence>
        {valid && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute inset-0 inline-block rounded-full bg-green-400"
          ></motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

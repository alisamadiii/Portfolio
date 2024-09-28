import React, { useState, ReactNode } from "react";

import { motion } from "framer-motion";

import { Button } from "./ui/button";
import { Text } from "./ui/text";

import { Sheet, SheetContent } from "@/components/ui/sheet";

interface FilesProps {
  id: string;
  children: ReactNode;
}

export const CodePreview: React.FC<FilesProps> = ({ children }) => {
  const [isCode, setIsCode] = useState(false);

  return (
    <>
      <div className="fixed bottom-10 left-1/2 grid h-12 w-80 -translate-x-1/2 grid-cols-2 rounded-full bg-natural-200 p-1">
        <Button
          className="relative isolate h-full rounded-full"
          variant={"ghost"}
        >
          {!isCode && (
            <motion.div
              layoutId="preview-bg"
              transition={{ duration: 0.3 }}
              className="absolute inset-0 -z-10 bg-natural-300/50"
              style={{ borderRadius: 24 }}
            />
          )}
          Preview
        </Button>
        <Button
          className="relative isolate h-full rounded-full"
          variant={"ghost"}
          onClick={() => setIsCode(!isCode)}
        >
          {isCode && (
            <motion.div
              layoutId="preview-bg"
              transition={{ duration: 0.3 }}
              className="absolute inset-0 -z-10 bg-natural-300/50"
              style={{ borderRadius: 24 }}
            />
          )}
          Code
        </Button>
      </div>

      <Sheet open={isCode} onOpenChange={setIsCode}>
        <SheetContent>
          <header className="flex items-center justify-between">
            <Text element="h2" variant="h2">
              Code
            </Text>
            <button onClick={() => setIsCode(false)}>
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_12_96)">
                  <path
                    d="M19.41 17.9999L27.7 9.70994C27.8638 9.51864 27.9494 9.27256 27.9397 9.02089C27.93 8.76921 27.8256 8.53047 27.6475 8.35238C27.4694 8.17428 27.2307 8.06995 26.979 8.06023C26.7274 8.05051 26.4813 8.13612 26.29 8.29994L18 16.5899L9.70997 8.28994C9.52167 8.10164 9.26627 7.99585 8.99997 7.99585C8.73367 7.99585 8.47828 8.10164 8.28997 8.28994C8.10167 8.47825 7.99588 8.73364 7.99588 8.99994C7.99588 9.26624 8.10167 9.52164 8.28997 9.70994L16.59 17.9999L8.28997 26.2899C8.18529 26.3796 8.10027 26.4899 8.04025 26.614C7.98022 26.738 7.94649 26.8732 7.94117 27.0109C7.93586 27.1486 7.95906 27.2859 8.00934 27.4143C8.05961 27.5426 8.13587 27.6591 8.23332 27.7566C8.33078 27.854 8.44732 27.9303 8.57565 27.9806C8.70398 28.0309 8.84131 28.0541 8.97903 28.0487C9.11675 28.0434 9.25188 28.0097 9.37594 27.9497C9.50001 27.8896 9.61033 27.8046 9.69997 27.6999L18 19.4099L26.29 27.6999C26.4813 27.8638 26.7274 27.9494 26.979 27.9397C27.2307 27.9299 27.4694 27.8256 27.6475 27.6475C27.8256 27.4694 27.93 27.2307 27.9397 26.979C27.9494 26.7273 27.8638 26.4812 27.7 26.2899L19.41 17.9999Z"
                    fill="#5D5D5D"
                  />
                </g>
              </svg>
            </button>
          </header>
          {children}
        </SheetContent>
      </Sheet>
    </>
  );
};

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";

export default function TwoFactorAuthentication() {
  const [currentIndex, setCurrentIndex] = useState(10);

  const [values, setValues] = useState<string[]>(["", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleInputChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value[value.length - 1];
    setValues(newValues);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  console.log(currentIndex);

  useOnClickOutside(containerRef, () => setCurrentIndex(10));

  return (
    <div className="flex gap-3" ref={containerRef}>
      {[...Array(5)].map((_, index) => (
        <div key={index} className="relative">
          <input
            key={index}
            type="number"
            value={values[index]}
            ref={(el) => (inputRefs.current[index] = el)}
            className="h-12 w-8 rounded-md border border-gray-500 text-center font-semibold outline-none"
            onChange={(e) => handleInputChange(index, e.target.value)}
            onFocus={() => setCurrentIndex(index)}
          />

          {index === currentIndex && (
            <motion.div
              layoutId="two-factor-authentication"
              transition={{ duration: 0.5, ease: "backOut" }}
              className="absolute -inset-1 -z-10 rounded-md border-2 border-[rgb(107,114,128)]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

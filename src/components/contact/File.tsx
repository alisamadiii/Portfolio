import React, { memo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useContactStore } from "@/context/Contact.context";

type Props = {
  file: File;
};

function File({ file }: Props) {
  //   const { setIsDelete } = useContactStore();

  return (
    <motion.div
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={1}
      whileTap={{ cursor: "grabbing" }}
      //   onDrag={() => setIsDelete(true)}
      //   onDragEnd={() => setIsDelete(false)}
    >
      <Image
        src={URL.createObjectURL(file)}
        width={300}
        height={600}
        alt=""
        className="w-full mb-4 pointer-events-none rounded-xl"
      />
    </motion.div>
  );
}

export default memo(File);

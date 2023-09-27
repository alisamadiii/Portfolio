import React, { memo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Text } from "../ui/text";

import { AiOutlineInfoCircle } from "react-icons/ai";
import { convertingBytes } from "@/utils";

type Props = {
  file: File;
};

function File({ file }: Props) {
  //   const { setIsDelete } = useContactStore();
  const [isInformation, setIsInformation] = useState(false);

  console.log(file);

  return (
    <motion.div
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={1}
      whileTap={{ cursor: "grabbing" }}
      //   onDrag={() => setIsDelete(true)}
      //   onDragEnd={() => setIsDelete(false)}
      className="relative mb-4 overflow-hidden rounded-xl"
    >
      <motion.div
        layoutId={file.size.toString()}
        initial={{ scale: 1 }}
        animate={{ scale: isInformation ? 1.5 : 1 }}
        className={`w-full`}
      >
        <Image
          src={URL.createObjectURL(file)}
          width={300}
          height={600}
          alt=""
          className={`w-full h-full pointer-events-none rounded-xl duration-200`}
        />
      </motion.div>
      <AiOutlineInfoCircle
        className="absolute cursor-pointer top-4 right-4"
        onClick={() => setIsInformation(!isInformation)}
      />
      <AnimatePresence>
        {isInformation && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween" }}
            className="absolute top-0 right-0 w-full h-full p-4 pb-12 space-y-4 overflow-auto border bg-black/60 backdrop-blur rounded-xl custom-scrollbar fade-out-file_information"
            onClick={() => setIsInformation(false)}
            title="close"
          >
            <div>
              <Text size={10}>Name</Text>
              <Text size={14} className="text-foreground">
                {file.name.split(".")[0]}
              </Text>
            </div>
            <div>
              <Text size={10}>Type</Text>
              <Text size={14} className="text-foreground">
                {file.type}
              </Text>
            </div>
            <div>
              <Text size={10}>Size</Text>
              <Text size={14} className="text-foreground">
                {convertingBytes(file.size)}
              </Text>
            </div>
            <div>
              <Text size={10}>Modified</Text>
              <Text size={14} className="text-foreground">
                {file.lastModified}
              </Text>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(File);

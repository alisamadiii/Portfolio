import React, { memo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Text } from "../ui/text";

import { AiOutlineInfoCircle } from "react-icons/ai";
import { convertingBytes } from "@/utils";

interface Props {
  file: File;
}

function File({ file }: Props) {
  const [isInformation, setIsInformation] = useState(false);

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
        <FileDisplay file={file} />
      </motion.div>
      <AiOutlineInfoCircle
        className="absolute right-4 top-4 cursor-pointer"
        onClick={() => {
          setIsInformation(!isInformation);
        }}
      />
      <AnimatePresence>
        {isInformation && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween" }}
            className="custom-scrollbar fade-out-file_information absolute right-0 top-0 h-full w-full space-y-4 overflow-auto rounded-xl border bg-black/60 p-4 pb-12 backdrop-blur"
            onClick={() => {
              setIsInformation(false);
            }}
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

export default File;

const FileDisplay = memo(({ file }: { file: Blob | File }) => {
  return (
    <Image
      src={URL.createObjectURL(file)}
      width={300}
      height={600}
      alt=""
      className={`pointer-events-none h-full w-full rounded-xl duration-200`}
    />
  );
});

FileDisplay.displayName = "FileDisplay";

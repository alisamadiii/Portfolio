import Image from "next/image";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";
import { RotatingLines } from "react-loader-spinner";
import { Button } from "@/components/ui/button";

interface Props {
  file: File;
}

function ImageItem({ file }: Props) {
  const { currentUser } = UseUserContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const uploadingFiles = async () => {
      await supabase.storage
        .from("contact-form")
        .upload(
          `${
            currentUser?.user.user_metadata.full_name +
            "-" +
            currentUser?.user.user_metadata.provider_id
          }/${file.name}`,
          file
        );

      setIsLoading(false);
      console.log("done");
    };

    uploadingFiles();
  }, [file]);

  const deletingFiles = async () => {
    setIsDeleting(true);

    await supabase.storage
      .from("contact-form")
      .remove([
        `${
          currentUser?.user.user_metadata.full_name +
          "-" +
          currentUser?.user.user_metadata.provider_id
        }/${file.name}`,
      ]);

    setIsDeleting(false);
  };

  return (
    <div className="group relative mb-2 flex items-center justify-center overflow-hidden">
      {isLoading ? (
        <div className="absolute z-10 h-7 w-7 items-center justify-center rounded-xl bg-black/50 p-1">
          <RotatingLines
            strokeColor="white"
            strokeWidth="3"
            animationDuration="1"
            width="20"
            visible={true}
          />
        </div>
      ) : (
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ delay: 3 }}
          className="absolute z-10 flex items-center justify-center rounded-xl p-1 text-sm text-white"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              transition: { type: "spring", stiffness: 100 },
            }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            key={"completed"}
          >
            <svg
              width="24"
              height="100%"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.circle
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                cx="7"
                cy="7"
                r="6.65"
                stroke="currentColor"
                strokeWidth="0.7"
              />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
                d="M3 7L5.5 10L11 5"
                stroke="currentColor"
                strokeWidth="0.8"
              />
            </svg>
          </motion.span>
        </motion.div>
      )}
      <Image
        src={URL.createObjectURL(file)}
        width={300}
        height={300}
        alt=""
        className="h-full w-full object-cover duration-200"
        style={{ filter: `blur(${isLoading ? "2px" : ""})` }}
      />

      {!isLoading && (
        <Button
          variant={"error"}
          className="absolute bottom-0 left-0 w-28 translate-y-12 rounded-none rounded-tr-lg transition-all duration-200 group-hover:translate-y-0"
          onClick={deletingFiles}
        >
          {isDeleting && (
            <RotatingLines
              strokeColor="white"
              strokeWidth="3"
              animationDuration="1"
              width="16"
              visible={true}
            />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}

export default React.memo(ImageItem);

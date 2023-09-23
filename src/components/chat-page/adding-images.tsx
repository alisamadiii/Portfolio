import React, { ChangeEvent, useState } from "react";
import Compressor from "compressorjs";
import { motion } from "framer-motion";

import { Rect } from "../ui/box";
import { Label } from "../ui/label";

// Icons
import { FaFolderOpen } from "react-icons/fa";
import { BsImage } from "react-icons/bs";

import { Text } from "../ui/text";
import { useChatStore } from "@/context/Chat.context";
import { RotatingLines } from "react-loader-spinner";
import Image from "next/image";

type Props = {
  setIsVisible: (a: boolean) => void;
};

export default function AddingImages({ setIsVisible }: Props) {
  const { uploadedImage, setUploadedImage } = useChatStore();
  const [loading, setLoading] = useState(false);

  const importingFile = async (e: ChangeEvent) => {
    setLoading(true);
    const target = e.target as HTMLInputElement;
    const uploadedFiles = target.files;

    const compressedFiles: Blob[] = [];

    // @ts-ignore
    const compressing = Array.from(uploadedFiles).map((file) => {
      return new Promise((resolve: any) => {
        new Compressor(file, {
          quality: 0.6,
          success: (compressedResult) => {
            compressedFiles.push(compressedResult);
            resolve(); // Resolve this promise when all files are compressed.
          },
          error: (error) => {
            console.error("Compression error:", error);
          },
        });
      });
    });

    await Promise.all(compressing);

    setUploadedImage(compressedFiles);
    setIsVisible(false);
    setLoading(false);
  };

  return (
    <Rect className="fixed inset-0 z-50 grid w-full h-screen px-4 place-items-center isolate">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 w-full h-full bg-black/75 -z-10"
        onClick={() => setIsVisible(false)}
      />
      <Rect
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.35 }}
        className={`w-full max-w-md p-4 border rounded-xl bg-accents-1 space-y-2`}
      >
        <Label
          className={`flex w-full gap-3 p-4 duration-200 rounded cursor-pointer bg-accents-2/10 hover:bg-accents-2/20 ${
            loading && "bg-success-darker text-white"
          }`}
        >
          {loading ? (
            <RotatingLines
              strokeColor="white"
              strokeWidth="3"
              animationDuration="1"
              width="16"
              visible={true}
            />
          ) : (
            <FaFolderOpen className="text-xl" />
          )}
          <div>
            <Text>Choose from media</Text>
            <Text size={12}>You can only upload image</Text>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={importingFile}
          />
        </Label>

        {/* Notes */}
        {uploadedImage.length > 1 && (
          <div className="flex w-full gap-3 p-4 text-white duration-200 border rounded bg-success-darker">
            {loading ? (
              <RotatingLines
                strokeColor="white"
                strokeWidth="3"
                animationDuration="1"
                width="16"
                visible={true}
              />
            ) : (
              <BsImage className="text-xl" />
            )}
            <div className="space-y-2">
              <Text size={14}>
                You have uploaded {uploadedImage.length} images
              </Text>
              <div className="flex -space-x-4">
                {uploadedImage.map((image, index) => (
                  <Image
                    key={index}
                    src={URL.createObjectURL(image)}
                    width={25}
                    height={25}
                    alt=""
                    className="object-cover rounded-full shadow-[0_0_0_1px_white]"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Rect>
    </Rect>
  );
}

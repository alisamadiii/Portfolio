import React, { type ChangeEvent, type DragEvent, useState } from "react";
import Compressor from "compressorjs";
import { motion } from "framer-motion";

import { Rect } from "../ui/box";
import { Label } from "../ui/label";

// Icons
import { FaFolderOpen } from "react-icons/fa";
import { BsImage } from "react-icons/bs";
import { AiOutlineCloudUpload } from "react-icons/ai";

import { Text } from "../ui/text";
import { useChatStore } from "@/context/Chat.context";
import { RotatingLines } from "react-loader-spinner";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "../ui/switch";
import LinkInput from "./link-input";
import { Button } from "../ui/button";

interface Props {
  setIsVisible: (a: boolean) => void;
}

export default function AddingImages({ setIsVisible }: Props) {
  const { uploadedImage, setUploadedImage } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [isDroppingFile, setIsDroppingFile] = useState(false);

  const { uploadWay, setUploadWay } = useChatStore();

  const { toast } = useToast();

  const importingFile = async (e: ChangeEvent) => {
    const target = e.target as HTMLInputElement;
    const uploadedFiles: FileList | null = target.files;

    if (!uploadedFiles) return;

    if (Array.from(uploadedFiles).length > 5) {
      return toast({
        title: "5 Images",
        description: "you are not allowed to upload more than 5 images.",
        variant: "destructive",
      });
    }

    setLoading(true);

    const compressedFiles: Blob[] = [];

    const compressing = Array.from(uploadedFiles).map(async (file) => {
      return await new Promise((resolve: any) => {
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

  // Dropping images
  const onDropHandler = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const uploadedFiles = event.dataTransfer.files;

    if (Array.from(uploadedFiles).length > 5) {
      toast({
        title: "5 Images",
        description: "you are not allowed to upload more than 5 images.",
        variant: "destructive",
      });
      setIsDroppingFile(false);

      return;
    }

    const compressedFiles: Blob[] = [];

    const compressing = Array.from(uploadedFiles).map(async (file) => {
      if (file.type.startsWith("image")) {
        return await new Promise((resolve: any) => {
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
      } else {
        toast({
          title: "Only Image",
          description: "use a valid file",
          variant: "destructive",
        });
      }
    });

    await Promise.all(compressing);

    setUploadedImage(compressedFiles);
    setIsDroppingFile(false);
  };

  return (
    <Rect
      className="fixed inset-0 isolate z-50 grid h-screen w-full place-items-center px-4"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDroppingFile(true);
      }}
      onDragLeave={() => {
        setIsDroppingFile(false);
      }}
      onDrop={onDropHandler}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className={`absolute inset-0 -z-10 h-full w-full transition-colors ${
          isDroppingFile ? "animate-pulse bg-success/50" : "bg-black/75"
        }`}
        onClick={() => {
          setIsVisible(false);
        }}
      />
      {!isDroppingFile ? (
        <Rect
          key={"manual-uploading"}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.35 }}
          className={`flex w-full max-w-md flex-col gap-2 rounded-xl border bg-accents-1 p-4`}
        >
          {uploadWay === 1 ? (
            <>
              <Label
                className={`flex w-full cursor-pointer gap-3 rounded bg-accents-2/10 p-4 duration-200 hover:bg-accents-2/20 ${
                  loading && "bg-success-darker text-white"
                } ${uploadedImage.length === 5 && "bg-error-dark text-white"}`}
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
                  <Text size={12}>
                    You can only upload image - Maximum {uploadedImage.length} /
                    5 Images
                  </Text>
                </div>
                <input
                  type="file"
                  multiple
                  disabled={uploadedImage.length === 5}
                  accept="image/*"
                  className="hidden"
                  onChange={importingFile}
                />
              </Label>

              {uploadedImage.length !== 5 && (
                <Text size={10} className="text-right opacity-50">
                  Drag and Drop
                </Text>
              )}
            </>
          ) : (
            <div className="relative space-y-2 pr-6">
              <LinkInput />
              <LinkInput />
              <LinkInput />
              <div className="absolute right-0 ml-auto flex translate-y-4 flex-row-reverse gap-2">
                <Button type="button">Add</Button>
                <Button type="button">Preview</Button>
              </div>
            </div>
          )}

          {/* Notes */}
          {uploadedImage.length > 0 && (
            <div className="flex w-full gap-3 rounded border bg-success-darker p-4 text-white duration-200">
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
                      className="h-6 w-6 rounded-full object-cover shadow-[0_0_0_1px_white]"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <Label
            className={`flex cursor-pointer select-none items-center justify-end gap-2 text-xs ${
              uploadWay === 1 ? "mt-4" : "mt-20"
            }`}
          >
            Use link instead
            <Switch
              checked={uploadWay === 2}
              disabled={uploadedImage.length > 0}
              onCheckedChange={(checked) => {
                setUploadWay(checked ? 2 : 1);
              }}
            />
          </Label>
        </Rect>
      ) : (
        <div key={"dropping-uploading"} className="animate-bounce text-white">
          <AiOutlineCloudUpload className="text-6xl md:text-9xl" />
        </div>
      )}
    </Rect>
  );
}

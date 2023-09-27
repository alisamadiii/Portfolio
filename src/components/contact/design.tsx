import React, { DragEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Text } from "../ui/text";
import { useContactStore } from "@/context/Contact.context";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import Image from "next/image";
import File from "./File";

type Props = {};

export default function DesignPage({}: Props) {
  const { design, setDesign } = useContactStore();
  const [isUpload, setIsUpload] = useState(false);
  const [isDroppingFile, setIsDroppingFile] = useState(false);

  const [scrollWidth, setScrollWidth] = useState(0);
  useEffect(() => {
    const carousal = document.querySelector(".carousal") as HTMLDivElement;
    if (carousal) {
      setScrollWidth(carousal.scrollWidth - carousal.offsetWidth);
    }
  }, [design, setDesign]);

  // Dropping images
  const onDropHandler = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    const uploadedFiles = event.dataTransfer.files;

    setDesign({ ...design, files: Array.from(uploadedFiles!) });
    setIsDroppingFile(false);
  };

  return (
    <div className="space-y-8">
      <Text size={48} className="text-foreground">
        Your UI design
      </Text>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Url"
          value={design.url}
          onChange={(e) => setDesign({ ...design, url: e.target.value })}
          className="w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none"
        />
        {isUpload && design.files?.length == 0 && (
          <Label
            className={`flex items-center justify-center w-full h-48 max-w-xl border cursor-pointer rounded-xl ${
              isDroppingFile ? "bg-success/50 animate-pulse" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDroppingFile(true);
            }}
            onDragLeave={() => setIsDroppingFile(false)}
            onDrop={onDropHandler}
          >
            Drag and drop
            <input type="file" className="hidden" multiple />
          </Label>
        )}
        {design.files!.length > 0 && (
          <motion.div className="columns-2 md:columns-3 lg:columns-4">
            {design.files!.map((file) => (
              <File key={file.size} file={file} />
            ))}
          </motion.div>
        )}
        <Label className="flex items-center justify-end max-w-xl gap-4 cursor-pointer select-none">
          <Text size={16} variant={"muted-sm"}>
            Upload video or images
          </Text>
          <Switch
            onCheckedChange={(checked) => setIsUpload(checked)}
            disabled={design.files!.length > 0}
          />
        </Label>
      </div>
    </div>
  );
}

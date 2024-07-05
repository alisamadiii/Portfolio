import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import { motion, useAnimate } from "framer-motion";

import Image from "next/image";
import Icon from "./Icon";

interface Props {
  image: string;
  username: string;
}

export default function EachThread({ image, username }: Props) {
  const [inputField, setInputField] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  const [scope, animate] = useAnimate();

  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "21px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputField]);

  const onChangeHandler = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;

    // Check if the input consists of three or more consecutive empty lines
    if (value.match(/\n\s*\n\s*\n/)) {
      // If it does, don't update the state
      return;
    }

    setInputField(event.target.value);
  };

  const onAddingFilesHandler = async (event: ChangeEvent<HTMLInputElement>) => {
    await animate([[scope.current, { opacity: 0 }, { duration: 0.1 }]]);
    setFiles((prevFiles) => [
      ...prevFiles,
      // @ts-ignore
      ...Array.from(event.target.files).map((file) =>
        URL.createObjectURL(file)
      ),
    ]);
    await animate([
      [scope.current, { opacity: 1 }, { duration: 0.1, delay: 0.2 }],
    ]);
  };

  const onDeleteHandler = async (value: string) => {
    const values = [...files];

    const index = values.indexOf(value);

    if (index !== -1) {
      await animate([[scope.current, { opacity: 0 }, { duration: 0.1 }]]);

      values.splice(index, 1);

      setFiles(values);

      await animate([
        [scope.current, { opacity: 1 }, { duration: 0.1, delay: 0.2 }],
      ]);
    }
  };

  return (
    <div className="flex gap-4 px-4 pb-2">
      {/* User image */}
      <div className="fixed-size flex w-9 flex-col items-center gap-2 pt-1">
        <Image
          src={image}
          width={36}
          height={36}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="h-full w-0.5 bg-[#e5e5e5]"></div>
      </div>
      {/* Content */}
      <div className="grow">
        <h3 className="text-[15px] font-medium">{username}</h3>
        <textarea
          ref={textareaRef}
          value={inputField}
          onChange={onChangeHandler}
          placeholder="Start a thread..."
          className="h-[21px] w-full resize-none overflow-hidden bg-transparent text-[15px] font-light outline-none"
        ></textarea>
        {files && (
          <div
            ref={scope}
            className={`flex w-full gap-1 ${files.length >= 3 ? "overflow-auto" : ""}`}
          >
            {files.map((url) => (
              <motion.div
                key={url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className={`relative ${files.length >= 3 ? "fixed-size" : ""}`}
              >
                <button
                  className="button-shrink absolute right-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#00000066] text-white"
                  onClick={() => onDeleteHandler(url)}
                >
                  <Icon name="close-thin" className="w-[10px]" />
                </button>
                <Image
                  src={url}
                  width={400}
                  height={400}
                  alt=""
                  className={`h-full w-full rounded-lg object-cover ${files.length >= 3 ? "max-h-[227px]" : files.length === 2 ? "max-h-[255px]" : ""}`}
                />
              </motion.div>
            ))}
          </div>
        )}
        <div className="-ml-[6px] flex">
          <label className="text-icon-muted flex w-auto min-w-9 cursor-pointer items-center justify-center gap-1 p-2 text-[15px] duration-100 active:scale-95">
            <Icon name="gallery" className="w-5" /> {files.length > 0 && "Add"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={onAddingFilesHandler}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

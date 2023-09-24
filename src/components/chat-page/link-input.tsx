import React, { useEffect, useState } from "react";

type Props = {};

export default function LinkInput({}: Props) {
  const [validImage, setValidImage] = useState(false);
  const [inputField, setInputField] = useState("");

  useEffect(() => {
    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
    if (urlRegex.test(inputField) || inputField.length >= 0) {
      // Make a HEAD request to the URL to check the content type
      fetch(inputField, { method: "HEAD" })
        .then((response) => {
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            console.log(contentType);
            if (contentType && contentType.startsWith("image/")) {
              setValidImage(true);
            } else {
              setValidImage(false);
            }
          } else {
            setValidImage(false);
          }
        })
        .catch(() => {
          setValidImage(false);
        });
    }
  }, [inputField]);

  return (
    <div className="relative">
      <input
        type="text"
        className={`w-full p-2 duration-100 border rounded outline-none bg-accents-1 focus:ring-1 placeholder:opacity-50 ${
          validImage
            ? "border-success ring-success"
            : `${
                inputField.length > 0 ? "ring-error border-error" : "ring-white"
              }`
        }`}
        placeholder="under construction"
        value={inputField}
        onChange={(event) => setInputField(event.target.value)}
      />
      <div
        className={`absolute top-0 translate-y-5 right-0 w-4 h-[calc(100%+20px)] border-t border-r translate-x-[calc(100%)] rounded-tr-lg  ${
          validImage
            ? "border-success"
            : `${inputField.length > 0 && "border-error"}`
        }`}
      />
    </div>
  );
}

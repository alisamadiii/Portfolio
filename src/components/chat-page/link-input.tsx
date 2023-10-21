import React, { useEffect, useState } from "react";

export default function LinkInput() {
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
        className={`w-full rounded border bg-accents-1 p-2 outline-none duration-100 placeholder:opacity-50 focus:ring-1 ${
          validImage
            ? "border-success ring-success"
            : `${
                inputField.length > 0 ? "border-error ring-error" : "ring-white"
              }`
        }`}
        placeholder="under construction"
        value={inputField}
        onChange={(event) => {
          setInputField(event.target.value);
        }}
      />
      <div
        className={`absolute right-0 top-0 h-[calc(100%+20px)] w-4 translate-x-[calc(100%)] translate-y-5 rounded-tr-lg border-r border-t  ${
          validImage
            ? "border-success"
            : `${inputField.length > 0 && "border-error"}`
        }`}
      />
    </div>
  );
}

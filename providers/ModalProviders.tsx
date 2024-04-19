"use client";

import React, { useEffect, useState } from "react";

import ImagePreview from "@/app/components/Modal/ImagePreview";
import Talent from "@/app/components/Modal/Talent";

export default function ModalProviders() {
  const [isMountain, setIsMountain] = useState(false);

  useEffect(() => {
    setIsMountain(true);
  }, []);

  if (!isMountain) {
    return null;
  }

  return (
    <>
      <ImagePreview />
      <Talent />
    </>
  );
}

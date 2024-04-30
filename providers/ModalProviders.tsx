"use client";

import React, { useEffect, useState } from "react";

import ImagePreview from "@/components/Modal/ImagePreview";
import Talent from "@/components/Modal/Talent";

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

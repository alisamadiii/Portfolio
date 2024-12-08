import React from "react";

import * as Element from "@/components/TwitterContentsElement";
import { files } from "@/lib/utils";
import Image from "next/image";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {};

export default function TwitterContent22({}: Props) {
  const restartAnimation = async () => {
    const element = document.querySelector(
      ".custom-image-animate"
    ) as HTMLDivElement;
    if (element) {
      element.style.opacity = "0";
      element.classList.remove("custom-image-animate");
      await new Promise((resolve) => setTimeout(resolve, 150));
      element.classList.add("custom-image-animate");
      element.style.opacity = "1";
    }
  };

  return (
    <Element.Wrapper>
      <Element.Preview>
        <div className="custom-image-animate relative aspect-square w-72 overflow-hidden rounded-3xl">
          <Image
            src={files.image[1]}
            alt="image"
            width={400}
            height={400}
            className="h-full w-full object-cover"
          />
        </div>
        <Button variant="outline" size="sm" onClick={restartAnimation}>
          <RotateCw size={16} />
        </Button>
      </Element.Preview>
    </Element.Wrapper>
  );
}

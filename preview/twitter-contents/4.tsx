import React, { useState } from "react";
import { motion } from "framer-motion";

import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Position = "static" | "relative" | "absolute" | "fixed" | "sticky";

const initialPositions: Position[] = [
  "static",
  "relative",
  "absolute",
  "fixed",
  "sticky",
];

export default function TwitterContents4() {
  const [position, setPosition] = useState<Position>("static");

  const codeString = `div {
  position: ${position};
  top: 0px;
  left: 0px;
};`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview className="block h-96 overflow-auto p-4">
        <motion.div
          layout
          animate={{
            x: position === "fixed" ? -16 : 0,
            y: position === "fixed" ? -16 : 0,
          }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
          className={cn("mb-4 h-24 w-24 rounded-xl bg-natural-900")}
          style={{
            position: position === "fixed" ? "sticky" : position,
            top: 0,
            left: 0,
          }}
        />
        <motion.div
          layout
          transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
          className={cn("", position === "fixed" && "-mt-[112px]")}
        >
          <h1 className="text-2xl font-bold">Lorem Ipsum</h1>
          <Text variant={"p1-b"}>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Aperiam
            voluptas harum perferendis, aut totam ratione distinctio. Incidunt
            molestiae error ut eum, odio est magnam maiores. Aliquam modi
            possimus ipsum reprehenderit?
          </Text>
          <h1 className="mt-4 text-2xl font-bold">Lorem Ipsum</h1>
          <Text variant={"p1-b"}>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Repellat,
            voluptas ducimus nostrum libero fugiat veritatis est placeat sed
            harum sit voluptates in modi vero accusamus esse enim assumenda
            possimus velit. Vero aspernatur iusto ratione accusantium minima
            vitae perspiciatis sunt ex animi! Dignissimos cumque sapiente
            adipisci ipsam beatae inventore hic tempore eveniet soluta quis
            voluptatibus est iure ab, repudiandae commodi. Fugit!
          </Text>
          <h1 className="mt-4 text-2xl font-bold">Lorem Ipsum</h1>
          <Text variant={"p1-b"}>
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Similique
            illum, repellendus voluptas illo iste voluptatem iusto, doloribus
            aliquam, omnis quae soluta natus laborum mollitia fugit delectus
            nisi consequatur blanditiis non. Doloribus sequi aliquid tenetur
            officiis ratione dolore, porro facilis vel eaque consequatur ipsam
            doloremque sunt illo adipisci necessitatibus repudiandae omnis.
            Eaque hic alias sequi perspiciatis magnam ipsum provident, nemo quo.
            Rerum illum vero soluta maxime unde porro consectetur placeat eos
            fuga minima esse iure reiciendis blanditiis distinctio deleniti ad
            quod cum aliquam earum, voluptate facilis omnis libero veniam
            temporibus? Fugiat.
          </Text>
        </motion.div>
      </Element.Preview>
      <Element.Settings className="flex flex-wrap gap-2">
        {initialPositions.map((p) => (
          <Button
            key={p}
            variant={position === p ? "default" : "outline"}
            className="duration-0"
            onClick={() => setPosition(p)}
          >
            {p}
          </Button>
        ))}
      </Element.Settings>
    </Element.Wrapper>
  );
}

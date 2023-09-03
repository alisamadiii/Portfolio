import React from "react";

import { Container } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Box, Rect } from "@/components/ui/box";
import { Button } from "@/components/ui/button";

type Props = {};

export default function Brand({}: Props) {
  return (
    <Container size={"xl"} className="my-20 space-y-8">
      <Text size={32}>Text</Text>
      <Box className="flex flex-col gap-3">
        <Text size={48}>The Evil Rabbit jumps.</Text>
        <Text size={32}>The Evil Rabbit jumps.</Text>
        <Text size={24}>The Evil Rabbit jumps.</Text>
        <Text size={20}>The Evil Rabbit jumps.</Text>
        <Text size={16}>The Evil Rabbit jumps.</Text>
        <Text size={14}>The Evil Rabbit jumps.</Text>
        <Text size={12}>The Evil Rabbit jumps.</Text>
        <Text size={10}>The Evil Rabbit jumps.</Text>
        <Text size={16}>
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
        </Text>
        <Text size={20} variant={"muted-lg"}>
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
        </Text>
        <Text size={16} variant={"muted-base"}>
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
        </Text>
        <Text size={14} variant={"muted-sm"}>
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
          The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
        </Text>
      </Box>

      <Text size={32}>Colors</Text>

      <Box className="flex flex-wrap justify-between gap-4">
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-accents-1" />
          <Rect className="w-8 h-8 rounded-full bg-accents-2" />
          <Rect className="w-8 h-8 rounded-full bg-accents-3" />
          <Rect className="w-8 h-8 rounded-full bg-accents-4" />
          <Rect className="w-8 h-8 rounded-full bg-accents-5" />
          <Rect className="w-8 h-8 rounded-full bg-accents-6" />
          <Rect className="w-8 h-8 rounded-full bg-accents-7" />
          <Rect className="w-8 h-8 rounded-full bg-accents-8" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-success-lighter" />
          <Rect className="w-8 h-8 rounded-full bg-success-light" />
          <Rect className="w-8 h-8 rounded-full bg-success" />
          <Rect className="w-8 h-8 rounded-full bg-success-dark" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-error-lighter" />
          <Rect className="w-8 h-8 rounded-full bg-error-light" />
          <Rect className="w-8 h-8 rounded-full bg-error" />
          <Rect className="w-8 h-8 rounded-full bg-error-dark" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-warning-lighter" />
          <Rect className="w-8 h-8 rounded-full bg-warning-light" />
          <Rect className="w-8 h-8 rounded-full bg-warning" />
          <Rect className="w-8 h-8 rounded-full bg-warning-dark" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-violet-lighter" />
          <Rect className="w-8 h-8 rounded-full bg-violet-light" />
          <Rect className="w-8 h-8 rounded-full bg-violet" />
          <Rect className="w-8 h-8 rounded-full bg-violet-dark" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-cyan-lighter" />
          <Rect className="w-8 h-8 rounded-full bg-cyan-light" />
          <Rect className="w-8 h-8 rounded-full bg-cyan" />
          <Rect className="w-8 h-8 rounded-full bg-cyan-dark" />
        </div>
        <div className="flex -space-x-4">
          <Rect className="w-8 h-8 rounded-full bg-highlight-purple" />
          <Rect className="w-8 h-8 rounded-full bg-highlight-magenta" />
          <Rect className="w-8 h-8 rounded-full bg-highlight-pink" />
          <Rect className="w-8 h-8 rounded-full bg-highlight-yellow" />
        </div>
      </Box>

      <Text size={32}>Border Radius</Text>

      <Box className="flex flex-wrap gap-4">
        <Rect className="w-24 h-24 border rounded bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-lg bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-xl bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-2xl bg-accents-1" />
      </Box>

      <Text size={32}>Button</Text>

      <Box className="flex flex-wrap items-start gap-4">
        <Button size={"lg"}>Default - lg</Button>
        <Button size={"md"}>Default - md</Button>
        <Button variant={"error"} size={"lg"}>
          Error - lg
        </Button>
        <Button variant={"error"} size={"sm"}>
          Error - sm
        </Button>
        <Button variant={"github"}>Continue with GitHub</Button>
        <Button variant={"google"}>Continue with Google</Button>
      </Box>
    </Container>
  );
}

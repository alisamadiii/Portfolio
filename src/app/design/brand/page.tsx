"use client";

import React from "react";
import { motion, AnimatePresence, Variant } from "framer-motion";

import { Container } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Box, Rect } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import BgCircle from "@/components/bg-circle";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/use-toast";

import { Copy, Pencil, Reply, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type { FramerMotionType } from "@/types/index.t";
import { cn } from "@/lib/utils";

type Props = {};

export default function Brand({}: Props) {
  const [isModel, setIsModel] = React.useState(false);

  const { toast } = useToast();

  const openingModel = () => {
    if (isModel) {
      setIsModel(false);
      setTimeout(() => {
        // document.body.classList.remove("popup-open");
      }, 350);
    } else {
      setIsModel(true);
      // document.body.classList.add("popup-open");
    }
  };

  return (
    <Container size={"xl"} className="my-20 space-y-8">
      <BgCircle className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 w-96 h-96 blur-[120px] -z-50" />

      <Text size={32}>Text</Text>

      <Wrapper className="flex flex-col gap-3">
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
      </Wrapper>

      <Text size={32}>Colors</Text>

      <Wrapper className="flex flex-wrap justify-between gap-4">
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
      </Wrapper>

      <Text size={32}>Border Radius</Text>

      <Wrapper className="flex flex-wrap gap-4">
        <Rect className="w-24 h-24 border rounded bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-lg bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-xl bg-accents-1" />
        <Rect className="w-24 h-24 border rounded-2xl bg-accents-1" />
      </Wrapper>

      <Text size={32}>Button</Text>

      <Wrapper className="flex flex-wrap items-start gap-4">
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
      </Wrapper>

      <Text size={32}>Context</Text>

      <Wrapper className="grid gap-4 place-items-center">
        <ContextMenu>
          <ContextMenuTrigger className="grid w-full h-24 max-w-xs text-black bg-white border rounded select-none place-items-center">
            Right click
          </ContextMenuTrigger>
          <ContextMenuContent className="bg-accents-1">
            <ContextMenuItem
              className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
              onClick={() => {
                toast({
                  title: "Delete",
                  description: "You can delete text.",
                });
              }}
            >
              <Trash2 size={14} />
              Delete
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
              onClick={() => {
                toast({
                  title: "Edit",
                  description: "You can edit your message.",
                });
              }}
            >
              <Pencil size={14} />
              Edit
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
              onClick={() => {
                toast({
                  title: "Reply",
                  description: "You can reply to someone's message.",
                });
              }}
            >
              <Reply size={14} /> Reply
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
              onClick={() => {
                toast({
                  title: "Copy",
                  description: "You can copy text.",
                });
              }}
            >
              <Copy size={14} /> Copy Text
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Wrapper>

      <Text size={32}>Model</Text>

      <Wrapper>
        <Button size={"md"} onClick={openingModel}>
          Open Model
        </Button>
        <AnimatePresence>
          {isModel && (
            <Rect className="fixed inset-0 z-50 grid w-full h-screen px-4 place-items-center isolate">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 w-full h-full bg-black/75 -z-10"
                onClick={openingModel}
              />
              <Rect
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.35 }}
                className="w-full max-w-md border rounded-xl bg-accents-1 h-60"
              ></Rect>
            </Rect>
          )}
        </AnimatePresence>
      </Wrapper>

      <Text size={32}>Skeleton</Text>

      <Wrapper className="grid items-start gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4 grow">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2 grow">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-full h-2" />
              <Skeleton className="w-full h-2" />
              <Skeleton className="w-32 h-2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="w-full h-32 col-span-2" />
            <Skeleton className="w-full h-full row-span-2" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-32 col-span-3" />
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 grow">
          <Skeleton className="w-full aspect-square rounded-xl" />
          <div className="flex items-center w-1/2 gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2 grow">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-1/2 h-2" />
            </div>
          </div>
          <div className="w-full space-y-2">
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-1/2 h-2 rounded-full" />
          </div>
          <Skeleton className="w-32 h-12 mt-4" />
        </div>
      </Wrapper>
    </Container>
  );
}

const BoxAnimation: FramerMotionType = {
  hidden: { y: 40, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

interface WrapperProps {
  children: React.ReactNode;
  className?: string;
}

function Wrapper({ children, className }: WrapperProps) {
  return (
    <Box
      variants={BoxAnimation}
      initial="hidden"
      whileInView="visible"
      transition={{ ease: "easeOut", duration: 0.5 }}
      viewport={{ once: true, margin: "-100px" }}
      className={cn("", className)}
    >
      {children}
    </Box>
  );
}

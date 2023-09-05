"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotatingLines } from "react-loader-spinner";

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

// Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Copy, Pencil, Reply, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type { FramerMotionType } from "@/types/index.t";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { RotateToLocationCobe } from "@/components/cube/RotateToLocation";
import { DraggableCobe } from "@/components/cube/Draggable";
import { RotateDraggableCobe } from "@/components/cube/RotateDraggable";
import { AutoRotateCobe } from "@/components/cube/AutoRotate";
import useMeasure from "react-use-measure";

type Props = {};

type CobeTypes =
  | "auto-rotate"
  | "draggable"
  | "rotate-to-location"
  | "rotate-draggable";

export default function Brand({}: Props) {
  const [isModel, setIsModel] = React.useState(false);
  const [isAddingLocation, setIsAddingLocation] = React.useState(false);
  const [cobeType, setCobeType] = React.useState<CobeTypes>("auto-rotate");
  const [earth, { height, width }] = useMeasure();

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
    <>
      <Container size={"xl"} className="my-20 space-y-8" id="design-brand">
        <BgCircle className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 w-96 h-96 blur-[120px] -z-50" />

        <Text as="h2" size={32}>
          Text
        </Text>

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
          <Text size={16} variant={"space-grotesk"}>
            The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
            The Evil Rabbit jumps. The Evil Rabbit jumps. The Evil Rabbit jumps.
          </Text>
        </Wrapper>

        <Text as="h2" size={32}>
          Colors
        </Text>

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

        <Text as="h2" size={32}>
          Border Radius
        </Text>

        <Wrapper className="flex flex-wrap gap-4">
          <Rect className="w-24 h-24 border rounded bg-accents-1" />
          <Rect className="w-24 h-24 border rounded-lg bg-accents-1" />
          <Rect className="w-24 h-24 border rounded-xl bg-accents-1" />
          <Rect className="w-24 h-24 border rounded-2xl bg-accents-1" />
        </Wrapper>

        <Text as="h2" size={32}>
          Button
        </Text>

        <Wrapper className="flex flex-col items-start gap-6">
          <Text size={24}>Default</Text>
          <div className="flex flex-wrap items-start gap-4">
            <Button size={"lg"}>Default - lg</Button>
            <Button size={"md"}>Default - md</Button>
            <Button size={"sm"}>Default - sm</Button>
          </div>
          <Text size={24}>Primary</Text>
          <div className="flex flex-wrap items-start gap-4">
            <Button size={"lg"} variant={"primary"}>
              Primary - lg
            </Button>
            <Button size={"md"} variant={"primary"}>
              Primary - md
            </Button>
            <Button size={"sm"} variant={"primary"}>
              Primary - sm
            </Button>
          </div>
          <Text size={24}>Error</Text>
          <div className="flex flex-wrap items-start gap-4">
            <Button variant={"error"} size={"lg"}>
              Error - lg
            </Button>
            <Button variant={"error"} size={"md"}>
              Error - md
            </Button>
            <Button variant={"error"} size={"sm"}>
              Error - sm
            </Button>
          </div>
          <Text size={24}>Social Media</Text>
          <div className="flex flex-wrap items-start gap-4">
            <Button variant={"github"}>Continue with GitHub</Button>
            <Button variant={"google"}>Continue with Google</Button>
          </div>
          <Text size={24}>Loading</Text>
          <div className="flex flex-wrap items-start gap-4">
            <Button disabled size={"lg"}>
              <RotatingLines
                strokeColor="black"
                strokeWidth="3"
                animationDuration="1"
                width="24"
                visible={true}
              />
              Loader
            </Button>
            <Button disabled size={"md"}>
              <RotatingLines
                strokeColor="black"
                strokeWidth="3"
                animationDuration="1"
                width="20"
                visible={true}
              />
              Loader
            </Button>
            <Button disabled>
              <RotatingLines
                strokeColor="black"
                strokeWidth="3"
                animationDuration="1"
                width="18"
                visible={true}
              />
              Loader
            </Button>
          </div>
        </Wrapper>

        <Text as="h2" size={32}>
          Context
        </Text>

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

        <Text as="h2" size={32}>
          Model
        </Text>

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

        <Text as="h2" size={32}>
          Skeleton
        </Text>

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

        <Text as="h2" size={32}>
          Loader
        </Text>

        <Box className="flex flex-wrap items-center gap-8">
          <RotatingLines
            strokeColor="grey"
            strokeWidth="3"
            animationDuration="1"
            width="30"
            visible={true}
          />
          <RotatingLines
            strokeColor="grey"
            strokeWidth="3"
            animationDuration="1"
            width="24"
            visible={true}
          />
          <RotatingLines
            strokeColor="grey"
            strokeWidth="3"
            animationDuration="1"
            width="20"
            visible={true}
          />
          <RotatingLines
            strokeColor="grey"
            strokeWidth="3"
            animationDuration="1"
            width="18"
            visible={true}
          />
        </Box>

        <Text as="h2" size={32}>
          Switch
        </Text>

        <Box className="flex flex-wrap gap-4">
          <Switch />
          <Switch disabled />
          <Switch defaultChecked={true} />
        </Box>

        <Text as="h2" size={32}>
          Earth
        </Text>

        <motion.div
          animate={{ height }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
          className="border rounded-xl bg-background"
        >
          <Box className="bg-transparent border-none" ref={earth}>
            <Select onValueChange={(e: CobeTypes) => setCobeType(e)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cobe Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto-rotate">auto-rotate</SelectItem>
                <SelectItem value="draggable">draggable</SelectItem>
                <SelectItem value="rotate-draggable">
                  rotate-draggable
                </SelectItem>
                <SelectItem value="rotate-to-location">
                  rotate-to-location
                </SelectItem>
              </SelectContent>
            </Select>
            <div
              className={`flex flex-col items-center duration-500 ${
                isAddingLocation ? "scale-150 translate-y-36" : ""
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {cobeType == "auto-rotate" ? (
                  <AutoRotateCobe key={"auto-rotate"} />
                ) : cobeType == "draggable" ? (
                  <DraggableCobe key={"draggable"} />
                ) : cobeType == "rotate-draggable" ? (
                  <RotateDraggableCobe key={"rotate-draggable"} />
                ) : (
                  <RotateToLocationCobe key={"rotate-to-location"} />
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => setIsAddingLocation(true)}>
              Add your location
            </Button>
            <AnimatePresence>
              {isAddingLocation && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.35 }}
                  className="absolute bottom-0 left-0 w-full border-t h-1/3 bg-accents-1/90 backdrop-blur-xl"
                >
                  <X
                    size={24}
                    className="absolute top-4 right-4 text-accents-6 hover:text-white"
                    onClick={() => setIsAddingLocation(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </motion.div>
      </Container>

      <Container size={"2xl"} className="relative overflow-hidden isolate">
        <div className="absolute top-0 left-0 z-20 w-full h-px bg-gradient-to-l from-transparent via-white to-transparent" />
        <div
          className="absolute inset-0 w-full h-full -z-10 opacity-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0,rgba(255, 255, 255,.5) 0,rgba(255, 255, 255,0) 100%)",
          }}
        />
        <Container
          size={"xl"}
          className="grid items-center gap-8 py-32 text-center md:text-start md:grid-cols-3"
        >
          <div className="flex flex-col items-center gap-2 md:items-start md:col-span-2">
            <Avatar className="relative mb-4" id="outline-animation">
              <AvatarImage
                src="https://www.alirezasamadi.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.76a478a9.jpg&w=128&q=75"
                alt="logo"
                className="w-8 h-8 rounded-full"
                id=""
              />
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            <Text as="h2" size={32}>
              Who am I?
            </Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="font-normal line-clamp-2"
            >
              My name is Ali Reza and I am a web developer with over 2 years of
              experience in the field. I specialize in front-end development and
              have a strong background in ReactJS. I am always looking to learn
              and grow as a developer, and I am excited to work on new and
              challenging projects
            </Text>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <Button size={"lg"}>Know more</Button>
          </div>
        </Container>
      </Container>
    </>
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

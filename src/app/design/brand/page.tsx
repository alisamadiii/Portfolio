"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotatingLines } from "react-loader-spinner";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Box, Rect } from "@/components/ui/box";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import Checkbox from "@/components/ui/checkbox";
import * as Choicebox from "@/components/choicebox";

type Props = {};

export default function Brand({}: Props) {
  const [isModel, setIsModel] = React.useState(false);
  const [isChecked, setIsChecked] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<null | string>(
    null
  );

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

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <>
      <Container size={"xl"} className="my-20 space-y-8" id="design-brand">
        <BgCircle className="absolute left-1/2 top-0 -z-50 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[120px]" />

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
            <Rect className="h-8 w-8 rounded-full bg-accents-1" />
            <Rect className="h-8 w-8 rounded-full bg-accents-2" />
            <Rect className="h-8 w-8 rounded-full bg-accents-3" />
            <Rect className="h-8 w-8 rounded-full bg-accents-4" />
            <Rect className="h-8 w-8 rounded-full bg-accents-5" />
            <Rect className="h-8 w-8 rounded-full bg-accents-6" />
            <Rect className="h-8 w-8 rounded-full bg-accents-7" />
            <Rect className="h-8 w-8 rounded-full bg-accents-8" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-success-lighter" />
            <Rect className="h-8 w-8 rounded-full bg-success-light" />
            <Rect className="h-8 w-8 rounded-full bg-success" />
            <Rect className="h-8 w-8 rounded-full bg-success-dark" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-error-lighter" />
            <Rect className="h-8 w-8 rounded-full bg-error-light" />
            <Rect className="h-8 w-8 rounded-full bg-error" />
            <Rect className="h-8 w-8 rounded-full bg-error-dark" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-warning-lighter" />
            <Rect className="h-8 w-8 rounded-full bg-warning-light" />
            <Rect className="h-8 w-8 rounded-full bg-warning" />
            <Rect className="h-8 w-8 rounded-full bg-warning-dark" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-violet-lighter" />
            <Rect className="h-8 w-8 rounded-full bg-violet-light" />
            <Rect className="h-8 w-8 rounded-full bg-violet" />
            <Rect className="h-8 w-8 rounded-full bg-violet-dark" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-cyan-lighter" />
            <Rect className="h-8 w-8 rounded-full bg-cyan-light" />
            <Rect className="h-8 w-8 rounded-full bg-cyan" />
            <Rect className="h-8 w-8 rounded-full bg-cyan-dark" />
          </div>
          <div className="flex -space-x-4">
            <Rect className="h-8 w-8 rounded-full bg-highlight-purple" />
            <Rect className="h-8 w-8 rounded-full bg-highlight-magenta" />
            <Rect className="h-8 w-8 rounded-full bg-highlight-pink" />
            <Rect className="h-8 w-8 rounded-full bg-highlight-yellow" />
          </div>
        </Wrapper>

        <Text as="h2" size={32}>
          Border Radius
        </Text>

        <Wrapper className="flex flex-wrap gap-4">
          <Rect className="h-24 w-24 rounded border bg-accents-1" />
          <Rect className="h-24 w-24 rounded-lg border bg-accents-1" />
          <Rect className="h-24 w-24 rounded-xl border bg-accents-1" />
          <Rect className="h-24 w-24 rounded-2xl border bg-accents-1" />
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

        <Wrapper className="grid place-items-center gap-4">
          <ContextMenu>
            <ContextMenuTrigger className="grid h-24 w-full max-w-xs select-none place-items-center rounded border bg-white text-black">
              Right click
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-accents-1">
              <ContextMenuItem
                className="flex cursor-pointer items-center gap-2 text-xs text-accents-6 duration-100 hover:bg-accents-2 hover:text-white"
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
                className="flex cursor-pointer items-center gap-2 text-xs text-accents-6 duration-100 hover:bg-accents-2 hover:text-white"
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
                className="flex cursor-pointer items-center gap-2 text-xs text-accents-6 duration-100 hover:bg-accents-2 hover:text-white"
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
                className="flex cursor-pointer items-center gap-2 text-xs text-accents-6 duration-100 hover:bg-accents-2 hover:text-white"
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
              <Rect className="fixed inset-0 isolate z-50 grid h-screen w-full place-items-center px-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 -z-10 h-full w-full bg-black/75"
                  onClick={openingModel}
                />
                <Rect
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.35 }}
                  className="h-60 w-full max-w-md rounded-xl border bg-accents-1"
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
            <div className="flex grow items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="grow space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="col-span-2 h-32 w-full" />
              <Skeleton className="row-span-2 h-full w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="col-span-3 h-32 w-full" />
            </div>
          </div>

          <div className="flex grow flex-col items-start gap-4">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="flex w-1/2 items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="grow space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
            <div className="w-full space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-2 w-1/2 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-12 w-32" />
          </div>
        </Wrapper>

        <Text as="h2" size={32}>
          Loader
        </Text>

        <Wrapper className="flex flex-wrap items-center gap-8">
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
        </Wrapper>

        <Text as="h2" size={32}>
          Checkbox
        </Text>

        <Wrapper>
          <Checkbox
            checked={isChecked}
            onChange={(e) => setIsChecked(!isChecked)}
          />
        </Wrapper>

        <Text as="h2" size={32}>
          Choicebox
        </Text>

        <Wrapper>
          <Choicebox.Group className="flex gap-4">
            <Choicebox.Item
              name="choicebox"
              value={"option1"}
              checked={selectedOption == "option1"}
              onChange={handleRadioChange}
            >
              <Text size={16}>Testing</Text>
              <Text size={12} variant={"muted-sm"}>
                Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              </Text>
            </Choicebox.Item>
            <Choicebox.Item
              name="choicebox"
              value={"option2"}
              checked={selectedOption == "option2"}
              onChange={handleRadioChange}
            >
              <Text size={16}>Testing</Text>
              <Text size={12} variant={"muted-sm"}>
                Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              </Text>
            </Choicebox.Item>
          </Choicebox.Group>
        </Wrapper>

        <Text as="h2" size={32}>
          Switch
        </Text>

        <Wrapper className="flex flex-wrap gap-4">
          <Switch />
          <Switch disabled />
          <Switch defaultChecked={true} />
        </Wrapper>
      </Container>

      <Container size={"2xl"} className="relative isolate overflow-hidden">
        <div className="absolute left-0 top-0 z-20 h-px w-full bg-gradient-to-l from-transparent via-white to-transparent" />
        <div
          className="absolute inset-0 -z-10 h-full w-full opacity-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0,rgba(255, 255, 255,.5) 0,rgba(255, 255, 255,0) 100%)",
          }}
        />
        <Container
          size={"xl"}
          className="grid items-center gap-8 py-32 text-center md:grid-cols-3 md:text-start"
        >
          <div className="flex flex-col items-center gap-2 md:col-span-2 md:items-start">
            <Avatar className="relative mb-4" id="outline-animation">
              <AvatarImage
                src="https://www.alirezasamadi.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.76a478a9.jpg&w=128&q=75"
                alt="logo"
                className="h-8 w-8 rounded-full"
                id=""
              />
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            <Text size={32}>Who am I?</Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="line-clamp-2 font-normal"
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
      className={cn("p-4 md:p-6 lg:p-8", className)}
    >
      {children}
    </Box>
  );
}

"use client";

import React from "react";

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

type Props = {};

export default function Brand({}: Props) {
  const { toast } = useToast();

  return (
    <Container size={"xl"} className="my-20 space-y-8">
      <BgCircle className="absolute top-0 left-0 rounded-full bg-white/10 w-96 h-96 blur-[120px] -z-50" />
      <BgCircle className="absolute right-0 bottom-0 rounded-full bg-white/10 w-96 h-96 blur-[220px] -z-50" />

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

      <Text size={32}>Context</Text>

      <Box className="grid gap-4 place-items-center">
        <ContextMenu>
          <ContextMenuTrigger className="grid h-24 text-black bg-white border rounded w-96 place-items-center">
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
              <svg
                width="9"
                height="11"
                viewBox="0 0 9 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 0.611111H6.75L6.10714 0H2.89286L2.25 0.611111H0V1.83333H9M0.642857 9.77778C0.642857 10.1019 0.778316 10.4128 1.01943 10.642C1.26055 10.8712 1.58758 11 1.92857 11H7.07143C7.41242 11 7.73945 10.8712 7.98057 10.642C8.22168 10.4128 8.35714 10.1019 8.35714 9.77778V2.44444H0.642857V9.77778Z"
                  fill="currentColor"
                />
              </svg>
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
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.69927 0.451091C6.31479 0.451091 6.88472 0.645816 7.35064 0.978274L3.01254 5.3159C2.96718 5.35971 2.931 5.41211 2.90611 5.47006C2.88121 5.528 2.86811 5.59032 2.86756 5.65339C2.86702 5.71645 2.87903 5.77899 2.90291 5.83736C2.92679 5.89572 2.96206 5.94875 3.00665 5.99335C3.05125 6.03794 3.10427 6.07321 3.16264 6.09709C3.22101 6.12097 3.28355 6.13298 3.34661 6.13243C3.40968 6.13189 3.472 6.11878 3.52994 6.09389C3.58789 6.069 3.64029 6.03282 3.6841 5.98746L8.0222 1.64936C8.36564 2.13144 8.5498 2.70882 8.54891 3.30073V8.05012C8.54891 8.30204 8.44883 8.54365 8.2707 8.72179C8.09256 8.89992 7.85095 9 7.59903 9H0.949879C0.697955 9 0.45635 8.89992 0.278213 8.72179C0.100076 8.54365 0 8.30204 0 8.05012V1.40097C0 1.14905 0.100076 0.907441 0.278213 0.729304C0.45635 0.551167 0.697955 0.451091 0.949879 0.451091H5.69927ZM8.86094 0.139056C8.94998 0.22812 9 0.348901 9 0.474838C9 0.600775 8.94998 0.721556 8.86094 0.81062L8.02173 1.64936C7.83677 1.38972 7.6098 1.16275 7.35016 0.977799L8.1889 0.139056C8.27797 0.0500184 8.39875 0 8.52469 0C8.65062 0 8.77188 0.0500184 8.86094 0.139056Z"
                  fill="currentColor"
                />
              </svg>
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
              <svg
                width="9"
                height="7"
                viewBox="0 0 9 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 7V5C8 4.58333 7.85417 4.22917 7.5625 3.9375C7.27083 3.64583 6.91667 3.5 6.5 3.5H1.9125L3.7125 5.3L3 6L0 3L3 0L3.7125 0.7L1.9125 2.5H6.5C7.19167 2.5 7.78133 2.74383 8.269 3.2315C8.75667 3.71917 9.00033 4.30867 9 5V7H8Z"
                  fill="currentColor"
                />
              </svg>
              Reply
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Box>
    </Container>
  );
}

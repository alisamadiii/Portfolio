"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FilePlus2,
  GalleryVerticalEnd,
  Headphones,
  MessagesSquare,
  Search,
  Settings,
  Star,
  User,
  UserRoundPlus,
  X,
} from "lucide-react";

import IphoneSimulator from "@/components/IphoneSimulator";
import Image from "next/image";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { NavigatingClick } from "@/components/NavigatingClick";

interface Message {
  date: string;
  name: string;
  message: string;
  avatar_url: string;
  image_url?: string;
}

const messages: Message[] = [
  {
    date: "1:19 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
  },
  {
    date: "2:45 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
    image_url:
      "https://images.unsplash.com/photo-1426604966848-d7adac402bff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
    image_url:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
    image_url:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
  },
  {
    date: "4:30 PM",
    name: "Ali Samadi",
    message:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora aperiam dignissimos iure nisi fugit eius aliquam, commodi iste placeat ducimus voluptatum, ut similique sunt corrupti fugiat itaque iusto, suscipit quae?",
    avatar_url: "/my-image.png",
  },
];

export default function Work14() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <IphoneSimulator
      classWrapper="absolute top-12"
      className="bg-[#1C1D22] text-white"
    >
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/50"
              onClick={() => setIsOpen(false)}
            ></motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isOpen && (
            <div className="absolute left-0 top-[54px] z-[61] flex w-full justify-center">
              <motion.div
                layoutId="wrapper"
                className="relative h-full w-[97%] overflow-hidden bg-[#1B1D20]"
                style={{ borderRadius: 20 }}
              >
                <header className="flex h-12 items-center gap-1 px-2">
                  <div className="relative isolate h-8 w-8">
                    <motion.div
                      layoutId="wrapper-avatar"
                      animate={{ scale: 0, opacity: 0 }}
                      className="relative isolate h-8 w-8"
                    >
                      <Image
                        src="/my-image.png"
                        alt="logo"
                        fill
                        className="rounded-lg"
                      />
                    </motion.div>
                    <motion.button
                      layoutId="wrapper-close-button"
                      className="absolute left-0 top-0 -z-10 flex h-8 w-8 items-center justify-center text-[#C7C9CD]"
                      onClick={() => setIsOpen(false)}
                    >
                      <X strokeWidth={1.5} size={20} />
                    </motion.button>
                  </div>
                  <motion.div
                    layoutId="wrapper-user-info"
                    className="-space-y-px"
                  >
                    <h2 className="text-sm font-bold">Ali Samadi</h2>
                    <p className="flex items-center text-xs text-[#ABABB0]">
                      3 tabs
                    </p>
                  </motion.div>
                  <button className="ml-auto flex h-8 w-8 items-center justify-center">
                    <Ellipsis strokeWidth={1.5} size={20} />
                  </button>
                </header>
                <WrapperMenu />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <header className="sticky top-[48px] z-50 flex h-12 items-center gap-1 border-b border-b-[#27292E] bg-[#1C1D22] px-2">
          <button className="flex h-8 w-8 items-center justify-center">
            <ChevronLeft strokeWidth={1} size={30} />
          </button>
          <NavigatingClick />
          <motion.button
            layoutId="wrapper"
            className="relative grow overflow-hidden bg-[#232429] p-0.5"
            style={{ borderRadius: 8 }}
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center gap-2">
              <div className="relative isolate h-8 w-8">
                <motion.div
                  layoutId="wrapper-avatar"
                  className="relative isolate h-8 w-8"
                >
                  <Image
                    src="/my-image.png"
                    alt="logo"
                    fill
                    className="rounded-lg"
                  />
                </motion.div>
                <motion.button
                  layoutId="wrapper-close-button"
                  className="absolute left-0 top-0 -z-10 flex h-8 w-8 items-center justify-center"
                  onClick={() => setIsOpen(false)}
                >
                  <X strokeWidth={1.5} />
                </motion.button>
              </div>
              <motion.div layoutId="wrapper-user-info" className="-space-y-0.5">
                <h2 className="text-sm font-bold">Ali Samadi</h2>
                <p className="flex items-center text-xs text-[#ABABB0]">
                  3 tabs
                  <ChevronDown strokeWidth={1.5} size={16} />
                </p>
              </motion.div>
            </div>

            <WrapperMenu className="pointer-events-none absolute top-[48px] opacity-0" />
          </motion.button>
          <button className="flex h-8 w-8 items-center justify-center">
            <Headphones strokeWidth={1.7} size={20} />
          </button>
        </header>
        <div className="no-scrollbar mt-2 flex h-[600px] flex-col gap-4 overflow-auto p-2">
          {messages.map((message) => (
            <div key={message.date} className="flex items-start gap-2">
              <div className="relative h-8 w-8 shrink-0 rounded-lg bg-white">
                <Image
                  src={message.avatar_url}
                  alt="logo"
                  fill
                  className="rounded-lg"
                />
              </div>
              <div className="-mt-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{message.name}</p>
                  <p className="text-xs text-[#ABABB0]">{message.date}</p>
                </div>
                <p className="text-sm text-[#D2D3D6]">{message.message}</p>
                {message.image_url && (
                  <Image
                    src={message.image_url}
                    alt="image"
                    width={800}
                    height={400}
                    className="mt-2 w-full rounded-lg"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <footer className="sticky bottom-0 flex h-12 items-center justify-center bg-[#1C1D22]"></footer>
      </MotionConfig>
    </IphoneSimulator>
  );
}

function WrapperMenu({ className }: { className?: string }) {
  return (
    <AnimatePresence>
      <motion.div
        layoutId="wrapper-menu"
        className={cn("mt-1 text-[#C7C9CD]", className)}
      >
        <motion.div
          layout
          className="mb-2 grid grid-cols-3 gap-2 px-3 text-white"
        >
          <button className="flex h-9 items-center justify-center gap-1 rounded-lg border border-[#313538] px-1 text-sm">
            <UserRoundPlus strokeWidth={1.5} size={16} />
            Add
          </button>
          <button className="flex h-9 items-center justify-center gap-1 rounded-lg border border-[#313538] px-1 text-sm">
            <Star strokeWidth={1.5} size={16} />
            Move
          </button>
          <button className="flex h-9 items-center justify-center gap-1 rounded-lg border border-[#313538] px-1 text-sm">
            <Search strokeWidth={1.5} size={16} />
            Search
          </button>
        </motion.div>
        <motion.div layout className="flex flex-col px-1">
          <button className="flex h-8 items-center gap-1 rounded-lg px-1 text-start text-sm hover:bg-[#313538]">
            <div className="flex h-8 w-8 items-center justify-center">
              <MessagesSquare strokeWidth={1.5} size={16} />
            </div>
            Messages
          </button>
          <button className="flex h-8 items-center gap-1 rounded-lg px-1 text-start text-sm hover:bg-[#313538]">
            <div className="flex h-8 w-8 items-center justify-center">
              <FilePlus2 strokeWidth={1.5} size={16} />
            </div>
            Add canvas
          </button>
          <button className="flex h-8 items-center gap-1 rounded-lg px-1 text-start text-sm hover:bg-[#313538]">
            <div className="flex h-8 w-8 items-center justify-center">
              <GalleryVerticalEnd strokeWidth={1.5} size={16} />
            </div>
            Files
          </button>
        </motion.div>
        <div className="flex h-4 items-center justify-center">
          <Separator className="w-full bg-[#23272A]" />
        </div>
        <motion.div layout className="flex flex-col px-1">
          <button className="flex h-8 items-center gap-1 rounded-lg px-1 text-start text-sm hover:bg-[#313538]">
            <div className="flex h-8 w-8 items-center justify-center">
              <User strokeWidth={1.5} size={16} />
            </div>
            <span className="inline-block grow">View Profile</span>
            <ChevronRight strokeWidth={1.5} size={16} />
          </button>
          <button className="flex h-8 items-center gap-1 rounded-lg px-1 text-start text-sm hover:bg-[#313538]">
            <div className="flex h-8 w-8 items-center justify-center">
              <Settings strokeWidth={1.5} size={16} />
            </div>
            <span className="inline-block grow">View Profile</span>
            <ChevronRight strokeWidth={1.5} size={16} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

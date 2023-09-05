"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";

import { RotateToLocationCobe } from "@/components/cobe/RotateToLocation";
import { DraggableCobe } from "@/components/cobe/Draggable";
import { RotateDraggableCobe } from "@/components/cobe/RotateDraggable";
import { AutoRotateCobe } from "@/components/cobe/AutoRotate";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import { Container } from "@/components/ui/container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Back from "@/components/back";

type Props = {};

type CobeTypes =
  | "auto-rotate"
  | "draggable"
  | "rotate-to-location"
  | "rotate-draggable";

export default function Cobe({}: Props) {
  const [earth, { height, width }] = useMeasure();
  const [cobeType, setCobeType] = React.useState<CobeTypes>("auto-rotate");
  const [isAddingLocation, setIsAddingLocation] = React.useState(false);

  return (
    <Container size={"xl"} className="my-4">
      <Back to="/design/brand" />
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
              <SelectItem value="rotate-draggable">rotate-draggable</SelectItem>
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
  );
}

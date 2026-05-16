"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@workspace/ui/lib/utils";

function Drawer({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  direction = "bottom",
  ...props
}: DialogPrimitive.Popup.Props & {
  direction?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Popup
        data-slot="drawer-content"
        data-direction={direction}
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          direction === "top" &&
            "data-open:slide-in-from-top data-closed:slide-out-to-top data-open:animate-in data-closed:animate-out inset-x-0 top-0 mb-24 max-h-[80vh] rounded-b-lg border-b",
          direction === "bottom" &&
            "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom data-open:animate-in data-closed:animate-out inset-x-0 bottom-0 mt-24 max-h-[80vh] rounded-t-lg border-t",
          direction === "right" &&
            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:animate-in data-closed:animate-out inset-y-0 right-0 w-3/4 border-l sm:max-w-sm",
          direction === "left" &&
            "data-open:slide-in-from-left data-closed:slide-out-to-left data-open:animate-in data-closed:animate-out inset-y-0 left-0 w-3/4 border-r sm:max-w-sm",
          className
        )}
        {...props}
      >
        {direction === "bottom" && (
          <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full data-[direction=bottom]:block" />
        )}
        {children}
      </DialogPrimitive.Popup>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-0.5 p-4 md:gap-1.5", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};

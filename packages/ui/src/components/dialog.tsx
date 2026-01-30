"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out no-scrollbar data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-center-safe justify-center-safe overflow-y-auto bg-black/40 py-12 backdrop-blur-sm",
        className
      )}
      style={{ perspective: "1000px" }}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  overlayClassName?: string;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay
        className={overlayClassName}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "bg-background shadow-dialog-body data-[state=closed]:animate-out relative z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-4xl border p-6 backdrop-blur-sm duration-200 outline-none sm:max-w-lg",
            "data-[state=open]:animate-dialog-in",
            "data-[state=closed]:zoom-out-95 data-[state=closed]:blur-out-md data-[state=closed]:slide-out-to-bottom-30",
            className
          )}
          {...props}
        >
          <span
            className="pointer-events-none absolute -inset-px rounded-[inherit] bg-[linear-gradient(to_top_left,var(--foreground),transparent,var(--foreground))] p-px"
            style={{
              mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
              WebkitMask:
                "linear-gradient(black, black) content-box, linear-gradient(black, black)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
            }}
          ></span>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg leading-none font-bold tracking-tight md:text-2xl lg:text-3xl",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm leading-[120%]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

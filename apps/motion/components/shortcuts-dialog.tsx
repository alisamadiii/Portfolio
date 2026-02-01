import React from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";

const shortcuts = [
  { key: ["v"], action: "Code" },
  { key: ["r"], action: "Refresh" },
  { key: ["k"], action: "Keyboard shortcuts" },
  { key: ["d"], action: "Toggle dark/light mode" },
  { key: ["b"], action: "Toggle elements" },
  { key: ["s"], action: "Toggle settings" },
];

export const ShortcutsDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent overlayClassName="z-200" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Shortcuts</DialogTitle>
          <DialogDescription>
            Here are the shortcuts for the app.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3 py-2 text-sm font-medium">
            <div className="text-muted-foreground">Key</div>
            <div className="text-muted-foreground">Action</div>
          </div>
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3 py-2 text-sm"
            >
              <KbdGroup className="py-1">
                {shortcut.key.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
              <div className="py-1">{shortcut.action}</div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

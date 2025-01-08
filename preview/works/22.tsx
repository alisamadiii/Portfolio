import React, { useState } from "react";
import useMeasure from "react-use-measure";

import { Banknote, CreditCard, Plus, Wallet, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const initialValues = [
  {
    id: 1,
    title: "Bank Transfer",
    description: "Transfer money to your bank account",
    icon: <Banknote />,
  },
  {
    id: 2,
    title: "Debit/Credit Card",
    description: "Send money from your card",
    icon: <CreditCard />,
  },
  {
    id: 3,
    title: "Mobile Wallet",
    description: "Transfer money from your wallet",
    icon: <Wallet />,
  },
];

export default function Works22() {
  const [selected, setSelected] = useState<number | null>(null);

  const [ref, { height }] = useMeasure();

  const selectedItem = initialValues.find((item) => item.id === selected);

  return (
    <MotionConfig transition={{ duration: 0.6, type: "spring", bounce: 0.32 }}>
      <motion.div
        className="isolate w-full max-w-80 overflow-hidden border bg-white shadow-md"
        animate={{ height: height > 0 ? height : undefined }}
        style={{ borderRadius: 24 }}
      >
        <div ref={ref} className="relative">
          <div className={cn("p-4", selectedItem && "absolute -z-10")}>
            <h2 className="mb-4 font-semibold text-neutral-500">Send Money</h2>
            <div className="flex flex-col gap-4">
              {initialValues.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-2 text-left"
                  onClick={() => setSelected(item.id)}
                >
                  <motion.div
                    layoutId={`icon-${item.id.toString()}`}
                    className="rounded-full bg-neutral-100 p-2"
                  >
                    {item.icon}
                  </motion.div>
                  <div className="flex flex-col items-start">
                    <motion.h3
                      layoutId={`title-${item.id.toString()}`}
                      className="inline-block text-sm font-semibold"
                    >
                      {item.title}
                    </motion.h3>
                    <p className="text-xs text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  opacity: 0,
                  pointerEvents: "none",
                }}
                className={cn(
                  "bg-white p-4",
                  !selectedItem && "absolute left-0 top-0 w-full"
                )}
              >
                <header className="flex items-center gap-2">
                  <motion.div
                    layoutId={`icon-${selectedItem?.id.toString()}`}
                    className="rounded-full bg-neutral-100 p-2"
                  >
                    {selectedItem?.icon}
                  </motion.div>
                  <motion.h2
                    layoutId={`title-${selectedItem?.id.toString()}`}
                    className="inline-block text-sm font-semibold"
                  >
                    {selectedItem?.title}
                  </motion.h2>
                  <Button
                    size="icon"
                    variant="outline"
                    className="ml-auto size-6 rounded-full border-none text-neutral-400"
                    onClick={() => setSelected(null)}
                  >
                    <X size={16} />
                  </Button>
                </header>
                <Separator className="my-2 -ml-4 w-[calc(100%+4rem)] bg-neutral-100" />
                {selectedItem.id === 1 && <BankTransfer />}
                {selectedItem.id === 2 && <DebitCard />}
                {selectedItem.id === 3 && <MobileWallet />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

function BankTransfer() {
  return (
    <motion.div className="mt-4 w-full">
      <Label className="mb-2 text-sm font-medium text-neutral-500">
        Full name
      </Label>
      <Input className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50" />
      <Label className="mb-2 mt-3 text-sm font-medium text-neutral-500">
        Account number
      </Label>
      <Input className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50" />
      <Label className="mb-2 mt-3 text-sm font-medium text-neutral-500">
        Bank Code
      </Label>
      <Input className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50" />
      <Button className="mt-4 rounded-xl" size="sm">
        Proceed
      </Button>
    </motion.div>
  );
}

function DebitCard() {
  return (
    <div className="mt-4 w-full">
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-neutral-500">
        <h3>Available cards</h3>
        <Button
          size="sm"
          variant="outline"
          className="h-6 rounded-full px-2 text-xs"
        >
          <Plus size={12} /> Add card
        </Button>
      </div>
      <button className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100">
        <CreditCard className="h-4 w-4" />
        <span>•••• •••• •••• 6756</span>
      </button>
      <button className="mt-2 flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100">
        <CreditCard className="h-4 w-4" />
        <span>•••• •••• •••• 4712</span>
      </button>
      <Button className="mt-4 rounded-xl" size="sm">
        Proceed
      </Button>
    </div>
  );
}

function MobileWallet() {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-neutral-500">
        <Wallet className="h-8 w-8" />
        <span className="text-sm font-medium">Mobile Wallet</span>
      </div>
    </div>
  );
}

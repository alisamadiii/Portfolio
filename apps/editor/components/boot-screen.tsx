"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Circle, Terminal, Zap, AlertCircle } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { WebContainerStatus } from "@/hooks/use-webcontainer";

const STEP_ORDER: WebContainerStatus[] = [
  "booting",
  "mounting",
  "configuring",
  "installing",
  "starting",
  "ready",
];

const STEPS: { key: WebContainerStatus; label: string }[] = [
  { key: "booting", label: "Booting WebContainer" },
  { key: "mounting", label: "Loading project files" },
  { key: "configuring", label: "Configuring environment" },
  { key: "installing", label: "Installing dependencies" },
  { key: "starting", label: "Starting dev server" },
];

export const BootScreen = ({
  status,
  error,
  terminalOutput,
}: {
  status: WebContainerStatus;
  error: string | null;
  terminalOutput: string[];
}) => {
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Track the highest step reached (so error doesn't reset progress)
  const [highestStep, setHighestStep] = useState(-1);

  useEffect(() => {
    const idx = STEP_ORDER.indexOf(status);
    if (idx > highestStep) {
      setHighestStep(idx);
    }
  }, [status, highestStep]);

  // Always show terminal on error
  const isTerminalVisible = showTerminal || !!error;

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  const getStepState = (
    stepKey: WebContainerStatus
  ): "done" | "active" | "failed" | "pending" => {
    const stepIdx = STEP_ORDER.indexOf(stepKey);

    if (status === "error") {
      if (stepIdx < highestStep) return "done";
      if (stepIdx === highestStep) return "failed";
      return "pending";
    }

    const currentIdx = STEP_ORDER.indexOf(status);
    if (currentIdx > stepIdx) return "done";
    if (currentIdx === stepIdx) return "active";
    return "pending";
  };

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            error ? "text-red-400" : "text-emerald-400"
          )}
        >
          <Zap className="size-4" />
          {error ? "Environment Error" : "Preparing Environment"}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white"
          onClick={() => setShowTerminal(!isTerminalVisible)}
        >
          <Terminal className="size-4" />
          {isTerminalVisible ? "Hide" : "Show"} Terminal
        </Button>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-8",
          isTerminalVisible ? "h-1/2 shrink-0" : "flex-1"
        )}
      >
        {/* Step indicators */}
        <div className="space-y-3">
          {STEPS.map((step) => {
            const state = getStepState(step.key);
            return (
              <div key={step.key} className="flex items-center gap-3">
                {state === "done" ? (
                  <Check className="size-4 text-emerald-400" />
                ) : state === "active" ? (
                  <Loader2 className="size-4 animate-spin text-emerald-400" />
                ) : state === "failed" ? (
                  <AlertCircle className="size-4 text-red-400" />
                ) : (
                  <Circle className="size-4 text-zinc-600" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    state === "done" && "text-emerald-400",
                    state === "active" && "text-white",
                    state === "failed" && "text-red-400",
                    state === "pending" && "text-zinc-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="max-w-lg rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Terminal output — full npm/build logs */}
      {isTerminalVisible && (
        <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800 bg-zinc-900">
          <div className="shrink-0 border-b border-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-500">
            Terminal Output
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5 text-zinc-400">
            {terminalOutput.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  line.toLowerCase().includes("error") && "text-red-400",
                  line.toLowerCase().includes("warn") && "text-yellow-400"
                )}
              >
                {line}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Play } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

type Tab = "fields" | "paste";

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export const EnvSetup = ({
  existingEnvExample,
  onContinue,
}: {
  existingEnvExample: string | null;
  onContinue: (envContent: string) => void;
}) => {
  const [tab, setTab] = useState<Tab>("paste");
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [rawText, setRawText] = useState("");

  // Parse .env.example if it exists — pre-populate keys
  useEffect(() => {
    if (!existingEnvExample) {
      setVars([{ id: crypto.randomUUID(), key: "", value: "" }]);
      return;
    }

    const parsed = existingEnvExample
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => {
        const eqIdx = line.indexOf("=");
        const key = eqIdx >= 0 ? line.slice(0, eqIdx).trim() : line.trim();
        const value = eqIdx >= 0 ? line.slice(eqIdx + 1).trim() : "";
        return { id: crypto.randomUUID(), key, value };
      });

    if (parsed.length === 0) {
      parsed.push({ id: crypto.randomUUID(), key: "", value: "" });
    }

    setVars(parsed);
    // Also set raw text from example
    setRawText(existingEnvExample);
  }, [existingEnvExample]);

  const addVar = useCallback(() => {
    setVars((prev) => [
      ...prev,
      { id: crypto.randomUUID(), key: "", value: "" },
    ]);
  }, []);

  const removeVar = useCallback((id: string) => {
    setVars((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const updateVar = useCallback(
    (id: string, field: "key" | "value", val: string) => {
      setVars((prev) =>
        prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
      );
    },
    []
  );

  const handleContinue = useCallback(() => {
    if (tab === "paste") {
      onContinue(rawText.trim());
    } else {
      const envContent = vars
        .filter((v) => v.key.trim())
        .map((v) => `${v.key.trim()}=${v.value}`)
        .join("\n");
      onContinue(envContent);
    }
  }, [tab, rawText, vars, onContinue]);

  const handleSkip = useCallback(() => {
    onContinue("");
  }, [onContinue]);

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-medium text-emerald-400">
          Environment Variables
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-xl space-y-6 px-6">
          <div>
            <h2 className="text-lg font-semibold">Configure Environment</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {existingEnvExample
                ? "We found a .env.example — fill in the values below."
                : "Add any environment variables your project needs."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-md bg-zinc-900 p-0.5 text-sm">
            <button
              onClick={() => setTab("paste")}
              className={cn(
                "flex-1 rounded px-3 py-1.5 transition-colors",
                tab === "paste"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Paste .env
            </button>
            <button
              onClick={() => setTab("fields")}
              className={cn(
                "flex-1 rounded px-3 py-1.5 transition-colors",
                tab === "fields"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Edit fields
            </button>
          </div>

          {/* Paste tab */}
          {tab === "paste" && (
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "DATABASE_URL=postgres://...\nNEXT_PUBLIC_API_URL=https://...\nSECRET_KEY=sk_..."
              }
              className="min-h-[200px] resize-none border-zinc-700 bg-zinc-900 font-mono text-sm leading-6"
            />
          )}

          {/* Fields tab */}
          {tab === "fields" && (
            <>
              <div className="space-y-2">
                {vars.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <Input
                      placeholder="KEY"
                      value={v.key}
                      onChange={(e) => updateVar(v.id, "key", e.target.value)}
                      className="h-9 flex-1 border-zinc-700 bg-zinc-900 font-mono text-sm"
                    />
                    <span className="text-zinc-600">=</span>
                    <Input
                      placeholder="value"
                      value={v.value}
                      onChange={(e) =>
                        updateVar(v.id, "value", e.target.value)
                      }
                      className="h-9 flex-[2] border-zinc-700 bg-zinc-900 font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-zinc-500 hover:text-red-400"
                      onClick={() => removeVar(v.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400"
                onClick={addVar}
              >
                <Plus className="size-3.5" />
                Add variable
              </Button>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleContinue}>
              <Play className="size-4" />
              Continue
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-400"
              onClick={handleSkip}
            >
              Skip — no env needed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

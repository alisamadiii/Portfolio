"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Progress } from "@workspace/ui/components/progress";

import { trpcClient, useTRPC } from "@workspace/trpc/client";

type ParsedContact = { email: string; firstName?: string; lastName?: string };

const CHUNK_SIZE = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Map loose CSV headers onto our fields — "Email Address", "first name",
// "FIRSTNAME" etc. all land where you'd expect.
const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
const FIELD_BY_HEADER: Record<string, keyof ParsedContact> = {
  email: "email",
  emailaddress: "email",
  firstname: "firstName",
  first: "firstName",
  name: "firstName",
  lastname: "lastName",
  last: "lastName",
  surname: "lastName",
};

function parseCsv(file: File): Promise<ParsedContact[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeHeader(h),
      complete: ({ data }) => {
        const seen = new Set<string>();
        const contacts: ParsedContact[] = [];
        for (const row of data) {
          const contact: ParsedContact = { email: "" };
          for (const [header, value] of Object.entries(row)) {
            const field = FIELD_BY_HEADER[header];
            if (field && typeof value === "string" && value.trim()) {
              contact[field] = value.trim();
            }
          }
          const email = contact.email.toLowerCase();
          if (!EMAIL_PATTERN.test(email) || seen.has(email)) continue;
          seen.add(email);
          contacts.push({ ...contact, email });
        }
        resolve(contacts);
      },
      error: reject,
    });
  });
}

export function ImportContactsDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setParsed(null);
    setFileName("");
    setImporting(false);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    try {
      const contacts = await parseCsv(file);
      if (!contacts.length) {
        toast.error("No valid email addresses found in that file.");
        return;
      }
      setFileName(file.name);
      setParsed(contacts);
    } catch {
      toast.error("Could not parse that CSV file.");
    }
  };

  // The server caps one call at 500 contacts, so big files go up in chunks
  // sequentially — the progress bar tracks completed chunks.
  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    let inserted = 0;
    let skipped = 0;
    try {
      if (!trpcClient) throw new Error("Not connected yet — try again.");
      for (let i = 0; i < parsed.length; i += CHUNK_SIZE) {
        const chunk = parsed.slice(i, i + CHUNK_SIZE);
        const result = await trpcClient.marketing.contacts.import.mutate({
          contacts: chunk,
        });
        inserted += result.inserted;
        skipped += result.skipped;
        setProgress(Math.round(((i + chunk.length) / parsed.length) * 100));
      }
      queryClient.invalidateQueries({
        queryKey: trpc.marketing.contacts.list.queryKey(),
      });
      toast.success(
        `Imported ${inserted} contact${inserted === 1 ? "" : "s"}` +
          (skipped ? ` (${skipped} already existed)` : "")
      );
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Import failed partway."
      );
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV with an email column — first/last name columns are
            picked up automatically. Existing contacts are never modified.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <label className="border-input hover:bg-muted/40 block cursor-pointer rounded-lg border border-dashed px-6 py-10 text-center transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <p className="text-sm font-medium">Choose a CSV file</p>
            <p className="text-muted-foreground mt-1 text-xs">
              or drop it on this box
            </p>
          </label>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-lg border px-4 py-3 text-sm">
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                {" "}
                — {parsed.length} valid contact{parsed.length === 1 ? "" : "s"}
              </span>
            </div>
            {importing && <Progress value={progress} />}
          </div>
        )}

        <DialogFooter>
          {parsed && (
            <>
              <Button variant="outline" disabled={importing} onClick={reset}>
                Choose another file
              </Button>
              <Button disabled={importing} onClick={() => void runImport()}>
                {importing
                  ? `Importing… ${progress}%`
                  : `Import ${parsed.length} contacts`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "motion/react";
import { useDropzone } from "react-dropzone";

import { storage } from "@/project.config";

import { Input } from "@workspace/ui/components/input";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";

import { columns } from "./columns";

export default function FilesPage() {
  const [searchById, setSearchById] = useState<string>("");

  const { uploadFiles, progress, isUploading } = storage.useUpload();

  const debouncedSearchTerm = useDebounce(searchById, 300);
  const trpc = useTRPC();
  const {
    data: files,
    isPending,
    isFetching,
  } = useQuery(
    trpc.admin.getFiles.queryOptions({
      search: debouncedSearchTerm,
    })
  );

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], folder?: "public") => {
      await uploadFiles(acceptedFiles, {
        path: folder,
      });
    },
    [uploadFiles]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const blob = item.getAsFile();
          if (!blob) return;

          uploadFiles([blob], {
            path: selectedFolder === "public" ? "public" : undefined,
          });
        }
      }
    },
    [selectedFolder, uploadFiles]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [selectedFolder, handlePaste]);

  const publicFolder = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles, "public"),
  });
  const privateFolder = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles),
  });

  return (
    <Content>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">S3 Buckets</h1>
      <div className="relative grid md:grid-cols-2">
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-background/50 text-muted-foreground absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-xl backdrop-blur-xs"
            >
              {Math.floor(progress)}%{" "}
              <p className="text-sm opacity-80">Uploading...</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div
          {...publicFolder.getRootProps()}
          onMouseEnter={() => setSelectedFolder("public")}
          onMouseLeave={() => setSelectedFolder(null)}
          className={cn(
            "flex h-96 w-full items-center justify-center border border-dashed border-r-transparent p-4 md:rounded-l-md",
            (publicFolder.isDragActive || selectedFolder === "public") &&
              "border-primary bg-primary/10",
            selectedFolder === "public" && "border-r"
          )}
        >
          <input {...publicFolder.getInputProps()} />
          <p>Upload public files</p>
        </div>
        <div
          {...privateFolder.getRootProps()}
          onMouseEnter={() => setSelectedFolder("private")}
          onMouseLeave={() => setSelectedFolder(null)}
          className={cn(
            "flex h-96 w-full items-center justify-center border border-dashed p-4 md:rounded-r-md",
            (privateFolder.isDragActive || selectedFolder === "private") &&
              "border-destructive bg-destructive/10",
            (publicFolder.isDragActive || selectedFolder === "public") &&
              "border-l-transparent"
          )}
        >
          <input {...privateFolder.getInputProps()} />
          <p>Upload private files</p>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 mb-6 max-w-sm px-4 text-xs">
        Hover your mouse over the folders to select them. You can also paste or
        drag and drop files into the folders.
      </p>

      <Input
        placeholder="Search by ID"
        value={searchById}
        onChange={(e) => setSearchById(e.target.value)}
        className="mb-4 max-w-64"
      />

      <DataTable
        columns={columns}
        isLoading={isPending || isFetching}
        data={files || []}
      />
    </Content>
  );
}

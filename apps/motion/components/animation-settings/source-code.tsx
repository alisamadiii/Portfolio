import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { animations } from "@/animations/registry";
import { useQuery } from "@tanstack/react-query";
import { Copy, FileCode2, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { codeToHtml } from "shiki";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { BoxShield, Empty, Error, TechIcons } from "@workspace/ui/icons";
import { portalLoginUrl } from "@workspace/ui/lib/company";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import {
  generateInstallCommand,
  getPackagesFromCode,
  updateSourceCode,
} from "@/lib/utils";

import { PricingDrawer } from "../pricing-drawer";

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  scss: "scss",
  json: "json",
  html: "html",
  md: "markdown",
  mdx: "mdx",
  svg: "svg",
};

function getLangFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "text";
}

function ShikiCodeBlock({
  code,
  filename,
  className,
}: {
  code: string;
  filename: string;
  className?: string;
}) {
  const htmlQuery = useQuery({
    queryKey: ["shiki", filename, code],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const updatedCode = updateSourceCode(code);

      return codeToHtml(updatedCode, {
        lang: getLangFromFilename(filename),
        theme: "github-dark",
      });
    },
    enabled: !!code && !!filename,
  });

  if (htmlQuery.isPending) {
    return (
      <pre className={`p-4 text-sm opacity-0 ${className ?? ""}`}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-4 right-4 -mb-8 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(updateSourceCode(code));
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
      <div
        data-code
        className={cn(
          "animate-in fade-in-0 overflow-x-auto rounded-lg text-sm [&_code]:text-sm! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-4!",
          className
        )}
        dangerouslySetInnerHTML={{ __html: htmlQuery.data ?? "" }}
      />
    </div>
  );
}

export const SourceCode = () => {
  const { slug } = useParams<{ slug: string }>();

  const animation = animations[slug as keyof typeof animations];

  const trpc = useTRPC();
  const fileQuery = useQuery(
    trpc.sources.getFiles.queryOptions(
      { sourceId: animation.id },
      {
        enabled: !!animation.id,
      }
    )
  );

  return (
    <motion.div
      initial={{
        x: 400,
        scale: 0.8,
        filter: "blur(4px)",
        opacity: 0,
      }}
      animate={{
        x: 0,
        scale: 1,
        filter: "blur(0px)",
        opacity: 1,
      }}
      exit={{
        x: 400,
        scale: 0.8,
        filter: "blur(4px)",
        opacity: 0,
      }}
      className="dark text-foreground pointer-events-none fixed right-0 bottom-0 h-[calc(100dvh-4rem)] w-full p-4 lg:w-[600px]"
      transition={{
        duration: 0.5,
        ease: [0.19, 1, 0.22, 1],
      }}
    >
      <div className="bg-background shadow-dialog pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[3rem] border">
        {fileQuery.isPending ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <Spinner className="size-8" />
          </div>
        ) : fileQuery.isError ? (
          <div className="bg-background text-destructive flex h-full w-full flex-col items-center justify-center gap-4">
            <Error className="size-48 mask-b-from-5" />
            <p className="-mt-4">
              {fileQuery.error.message ?? "Failed to load source code"}
            </p>
            <PricingDrawer>
              <Button size="sm">Purchase Animation</Button>
            </PricingDrawer>
          </div>
        ) : fileQuery.data?.length === 0 ? (
          <div className="bg-background text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-4">
            <Empty className="size-48 mask-b-from-5" />
            <p className="-mt-4">No source code found</p>
          </div>
        ) : (
          <FileList animationId={animation.id} slug={slug} />
        )}
      </div>
    </motion.div>
  );
};

const FileList = ({
  animationId,
  slug,
}: {
  animationId: string;
  slug: string;
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"usage" | "source">("source");
  const trpc = useTRPC();
  const fileQuery = useQuery(
    trpc.sources.getFiles.queryOptions(
      { sourceId: animationId },
      {
        enabled: !!animationId,
      }
    )
  );
  const { data: user } = useCurrentUser();

  const fileIndex =
    fileQuery.data?.findIndex((file) => file.id === selectedFile) || 0;

  // Detect packages from all files
  const { installCommand, hasAccess } = useMemo(() => {
    if (!fileQuery.data) return { installCommand: "", hasAccess: false };
    const allCode = fileQuery.data
      .map((f) => f.content ?? f.preview ?? "")
      .join("\n");
    const packages = getPackagesFromCode(allCode);
    const access = fileQuery.data.some((f) => f.content !== null);
    return {
      installCommand: generateInstallCommand(packages),
      hasAccess: access,
    };
  }, [fileQuery.data]);

  // Usage snippet
  const usageSnippet = useMemo(() => {
    const componentName = slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return `import ${componentName} from "./components/${slug}";\n\nexport default function Page() {\n  return <${componentName} />;\n}`;
  }, [slug]);

  useHotkeys(
    "left",
    () => {
      if (fileIndex > 0) {
        setSelectedFile(fileQuery.data?.[fileIndex - 1]?.id ?? null);
      }
    },
    [fileIndex]
  );

  useHotkeys(
    "right",
    () => {
      if (fileIndex < (fileQuery.data?.length ?? 0) - 1) {
        setSelectedFile(fileQuery.data?.[fileIndex + 1]?.id ?? null);
      }
    },
    [fileIndex]
  );

  const handleCopyAll = () => {
    if (!fileQuery.data) return;
    const allFiles = fileQuery.data
      .filter((f) => f.content !== null)
      .map(
        (f) => `// ── ${f.filename} ──\n${updateSourceCode(f.content ?? "")}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(allFiles);
    toast.success("All files copied to clipboard");
  };

  return (
    <>
      {/* Install command banner */}
      {installCommand && (
        <div className="border-b px-6 py-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(installCommand);
              toast.success("Install command copied");
            }}
            className="bg-muted hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors"
          >
            <Terminal className="text-muted-foreground size-4 shrink-0" />
            <code className="text-foreground flex-1 truncate text-left font-mono text-xs">
              {installCommand}
            </code>
            <Copy className="text-muted-foreground size-3.5 shrink-0" />
          </button>
        </div>
      )}

      {/* Tab bar: Usage / Source + Copy All */}
      <div className="flex items-center gap-1 border-b px-6">
        <button
          onClick={() => setActiveTab("usage")}
          className={cn(
            "text-muted-foreground flex items-center gap-1.5 border-b-2 border-transparent px-3 pt-3 pb-2 text-xs font-medium transition-colors",
            activeTab === "usage" && "text-primary border-primary"
          )}
        >
          <FileCode2 className="size-3.5" />
          Usage
        </button>
        <button
          onClick={() => setActiveTab("source")}
          className={cn(
            "text-muted-foreground flex items-center gap-1.5 border-b-2 border-transparent px-3 pt-3 pb-2 text-xs font-medium transition-colors",
            activeTab === "source" && "text-primary border-primary"
          )}
        >
          Source
          <span className="text-muted-foreground/60 text-[10px]">
            {fileQuery.data?.length ?? 0}
          </span>
        </button>
        <div className="flex-1" />
        {hasAccess && activeTab === "source" && (
          <button
            onClick={handleCopyAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 pb-1 text-xs transition-colors"
          >
            <Copy className="size-3" />
            Copy all
          </button>
        )}
      </div>

      {/* Usage tab content */}
      {activeTab === "usage" ? (
        <div className="custom-scrollbar flex-1 overflow-auto">
          <ShikiCodeBlock code={usageSnippet} filename="page.tsx" />
        </div>
      ) : (
        <>
          {/* Source file tabs */}
          <header className="bg-muted sticky top-0 left-0 z-20 flex items-center border-b px-8 backdrop-blur-sm">
            {fileQuery.data?.map((file, index) => (
              <button
                key={file.id}
                className={cn(
                  "text-muted-foreground flex items-center gap-2 border-b-4 border-transparent px-2 pt-6 pb-4 text-sm transition-all duration-200",
                  (selectedFile === file.id ||
                    (index === 0 && !selectedFile)) &&
                    "text-primary border-primary"
                )}
                onClick={() => setSelectedFile(file.id)}
              >
                <TechIcons
                  name={
                    file.filename.split(".").pop() as
                      | "ts"
                      | "js"
                      | "html"
                      | "css"
                      | "bash"
                      | "tsx"
                      | "jsx"
                      | "json"
                  }
                />
                {file.filename}
              </button>
            ))}
          </header>

          {/* Source file content */}
          <main
            className="flex h-0 grow"
            style={{
              transform: `translateX(-${fileIndex * 100}%)`,
              transition: "transform 0.3s ease-in-out",
            }}
          >
            {fileQuery.data?.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "custom-scrollbar shrink-0 basis-full overflow-auto",
                  file.content === null &&
                    file.preview &&
                    "overflow-hidden"
                )}
              >
                {file.content !== null ? (
                  <ShikiCodeBlock
                    code={file.content}
                    filename={file.filename}
                  />
                ) : file.preview !== null ? (
                  <div>
                    <ShikiCodeBlock
                      code={file.preview}
                      filename={file.filename}
                      className="overflow-hidden mask-b-from-3"
                    />
                    <div className="flex h-full w-full -translate-y-12 flex-col items-center justify-center gap-4">
                      <BoxShield className="size-24" />
                      <p className="text-muted-foreground max-w-sm text-center text-sm">
                        Looks like you don&apos;t have access to this animation.
                        Don&apos;t worry, you can still view the source code by
                        purchasing the animation.
                      </p>
                      <div className="flex flex-col">
                        <PricingDrawer>
                          <Button size="sm">Purchase Animation</Button>
                        </PricingDrawer>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(user && "hidden")}
                          render={<Link href={portalLoginUrl(window.location.href)} />}
                        >
                            Login
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <pre className="text-muted-foreground bg-muted/50 rounded-lg p-4 text-sm">
                    Source is private. Purchase to view full content.
                  </pre>
                )}
              </div>
            ))}
          </main>
        </>
      )}
    </>
  );
};

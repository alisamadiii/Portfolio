import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { codeToHtml } from "shiki";

import { Button } from "@workspace/ui/components/button";
import { BoxShield, TechIcons } from "@workspace/ui/icons";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { animations } from "@/lib/animations";

import { LoginDrawer } from "../login-drawer";
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
      return codeToHtml(code, {
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
    <div
      data-code
      className={cn(
        "animate-in fade-in-0 overflow-x-auto rounded-lg text-sm [&_code]:text-sm! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-4!",
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlQuery.data ?? "" }}
    />
  );
}

export const SourceCode = () => {
  const { slug } = useParams<{ slug: string }>();

  const animation = animations[slug as keyof typeof animations];

  const trpc = useTRPC();
  const fileQuery = useQuery(
    trpc.motion.getFiles.queryOptions(
      { sourceId: animation.id },
      {
        enabled: !!animation.id,
      }
    )
  );

  console.log(fileQuery.error);

  return (
    <motion.div
      initial={{ x: 400, scale: 0.8, filter: "blur(4px)", opacity: 0 }}
      animate={{ x: 0, scale: 1, filter: "blur(0px)", opacity: 1 }}
      exit={{ x: 400, scale: 0.8, filter: "blur(4px)", opacity: 0 }}
      className="dark text-foreground pointer-events-none fixed right-0 bottom-0 h-[calc(100vh-4rem)] w-full p-4 lg:w-[600px]"
      transition={{
        duration: 0.5,
        type: "spring",
        bounce: 0.3,
      }}
    >
      <div className="bg-background shadow-dialog pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[3rem] border">
        <FileList animationId={animation.id} />
      </div>
    </motion.div>
  );
};

const FileList = ({ animationId }: { animationId: string }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const trpc = useTRPC();
  const fileQuery = useQuery(
    trpc.motion.getFiles.queryOptions(
      { sourceId: animationId },
      {
        enabled: !!animationId,
      }
    )
  );
  const { data: user } = useCurrentUser();

  const fileIndex =
    fileQuery.data?.findIndex((file) => file.id === selectedFile) || 0;

  console.log(fileQuery.data);

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

  return (
    <>
      <header className="bg-muted sticky top-0 left-0 z-20 flex items-center border-b px-8 backdrop-blur-sm">
        {fileQuery.data?.map((file, index) => (
          <button
            key={file.id}
            className={cn(
              "text-muted-foreground flex items-center gap-2 border-b-4 border-transparent px-2 pt-6 pb-4 text-sm transition-all duration-200",
              (selectedFile === file.id || (index === 0 && !selectedFile)) &&
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
              file.content === null && file.preview && "overflow-hidden"
            )}
          >
            {file.content !== null ? (
              <ShikiCodeBlock code={file.content} filename={file.filename} />
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
                    <LoginDrawer>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(user && "hidden")}
                      >
                        Login
                      </Button>
                    </LoginDrawer>
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
  );
};

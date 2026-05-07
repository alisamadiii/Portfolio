"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FileSystemTree } from "@webcontainer/api";
import { ArrowLeft, Code2, Eye, Terminal } from "lucide-react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { Button } from "@workspace/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { cn } from "@workspace/ui/lib/utils";

import { useWebContainer } from "@/hooks/use-webcontainer";

import { BootScreen } from "./boot-screen";
import { ChatPanel } from "./chat-panel";
import { CodeEditor } from "./code-editor";
import { EnvSetup } from "./env-setup";
import { FileExplorer } from "./file-explorer";
import { PreviewPanel } from "./preview-panel";
import { PublishButton } from "./publish-button";
import { TerminalPanel } from "./terminal-panel";

interface Project {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  previewBranch: string;
  productionBranch: string;
  packageManager: string;
  allowedPaths: string[];
  status: "active" | "paused" | "archived";
}

type RightPanel = "preview" | "code";

export const EditorWorkspace = ({ project }: { project: Project }) => {
  const {
    status,
    error,
    devServerUrl,
    terminalOutput,
    boot,
    continueInstall,
    writeFile,
    readFile,
    readdir,
  } = useWebContainer();

  const [rightPanel, setRightPanel] = useState<RightPanel>("preview");
  const [showTerminal, setShowTerminal] = useState(false);
  const [envExample, setEnvExample] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const dirtyFilesRef = useRef<Set<string>>(new Set());
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminalPanelRef = useRef<PanelImperativeHandle>(null);

  // Store project ID in sessionStorage for refresh recovery
  useEffect(() => {
    sessionStorage.setItem("editor-active-project", project.id);
    return () => {
      sessionStorage.removeItem("editor-active-project");
    };
  }, [project.id]);

  // Boot on mount
  useEffect(() => {
    const initWebContainer = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(
          `${apiUrl}/api/agent/files?projectId=${project.id}&format=webcontainer`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await boot(data.fsTree as FileSystemTree);
      } catch (err) {
        console.error("Failed to boot:", err);
      }
    };

    if (status === "idle") {
      initWebContainer();
    }
  }, [project.id, project.packageManager, status, boot]);

  // Read .env.example when configuring
  useEffect(() => {
    if (status === "configuring") {
      readFile(".env.example")
        .then((content) => setEnvExample(content))
        .catch(() => setEnvExample(null));
    }
  }, [status, readFile]);

  // Handle env vars submission
  const handleEnvContinue = useCallback(
    async (envContent: string) => {
      if (envContent.trim()) {
        await writeFile(".env", envContent);
        await writeFile(".env.local", envContent);
      }
      await continueInstall(project.packageManager);
    },
    [writeFile, continueInstall, project.packageManager]
  );

  // Refresh file tree when ready
  useEffect(() => {
    if (status === "ready") {
      refreshFileTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const refreshFileTree = useCallback(async () => {
    try {
      const paths = await readdir(".", { recursive: true });
      const filtered = paths.filter(
        (p) =>
          !p.startsWith("node_modules/") &&
          !p.startsWith(".next/") &&
          !p.startsWith(".git/") &&
          !p.startsWith(".turbo/")
      );
      setFilePaths(filtered);
    } catch {
      // Container may not be ready yet
    }
  }, [readdir]);

  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      setRightPanel("code");
      try {
        const content = await readFile(path);
        setFileContent(content);
      } catch {
        setFileContent("// Failed to read file");
      }
    },
    [readFile]
  );

  const handleFileSave = useCallback(
    async (path: string, content: string) => {
      await writeFile(path, content);
      dirtyFilesRef.current.add(path);
      scheduleAutoSave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [writeFile]
  );

  const handleFileEdit = useCallback(
    async (edit: { path: string; content: string }) => {
      await writeFile(edit.path, edit.content);
      dirtyFilesRef.current.add(edit.path);

      if (edit.path === selectedFile) {
        setFileContent(edit.content);
      }

      scheduleAutoSave();
      refreshFileTree();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [writeFile, selectedFile, refreshFileTree]
  );

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const dirty = dirtyFilesRef.current;
      if (dirty.size === 0) return;

      try {
        const files = await Promise.all(
          Array.from(dirty).map(async (path) => ({
            path,
            content: await readFile(path),
          }))
        );

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        await fetch(`${apiUrl}/api/agent/files/save`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, files }),
        });

        dirtyFilesRef.current = new Set();
      } catch {
        // Silent fail — will retry on next edit
      }
    }, 10000);
  }, [project.id, readFile]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyFilesRef.current.size > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const getDirtyFiles = useCallback(async () => {
    const dirty = dirtyFilesRef.current;
    if (dirty.size === 0) return [];
    return Promise.all(
      Array.from(dirty).map(async (path) => ({
        path,
        content: await readFile(path),
      }))
    );
  }, [readFile]);

  const toggleTerminal = useCallback(() => {
    const panel = terminalPanelRef.current;
    if (!panel) return;
    if (showTerminal) {
      panel.collapse();
    } else {
      panel.expand();
      panel.resize(25);
    }
    setShowTerminal(!showTerminal);
  }, [showTerminal]);

  // Show env setup screen when configuring
  if (status === "configuring") {
    return (
      <EnvSetup
        existingEnvExample={envExample}
        onContinue={handleEnvContinue}
      />
    );
  }

  // Show boot screen for all other non-ready states
  if (status !== "ready") {
    return (
      <BootScreen
        status={status}
        error={error}
        terminalOutput={terminalOutput}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header / Toolbar */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">{project.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="bg-muted flex rounded-md p-0.5 text-sm">
            <button
              onClick={() => setRightPanel("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1",
                rightPanel === "preview" && "bg-background shadow-sm"
              )}
            >
              <Eye className="size-3.5" />
              Preview
            </button>
            <button
              onClick={() => setRightPanel("code")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1",
                rightPanel === "code" && "bg-background shadow-sm"
              )}
            >
              <Code2 className="size-3.5" />
              Code
            </button>
          </div>

          {/* Terminal toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", showTerminal && "bg-muted")}
            onClick={toggleTerminal}
          >
            <Terminal className="size-4" />
          </Button>

          <PublishButton projectId={project.id} getDirtyFiles={getDirtyFiles} />
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup orientation="vertical" className="flex-1">
        {/* Top: editor area */}
        <ResizablePanel defaultSize={100} minSize={30}>
          <ResizablePanelGroup orientation="horizontal">
            {/* Chat panel */}
            <ResizablePanel defaultSize="20%" className="border-r">
              <ChatPanel
                projectId={project.id}
                fileTree={filePaths}
                onFileEdit={handleFileEdit}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right panel: Preview or Code */}
            <ResizablePanel defaultSize="80%">
              {rightPanel === "preview" ? (
                <PreviewPanel url={devServerUrl} />
              ) : (
                <div className="flex h-full overflow-hidden">
                  <div className="w-56 shrink-0 overflow-y-auto border-r">
                    <FileExplorer
                      filePaths={filePaths}
                      selectedFile={selectedFile}
                      onSelect={handleFileSelect}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {selectedFile ? (
                      <CodeEditor
                        filePath={selectedFile}
                        content={fileContent}
                        onSave={handleFileSave}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          Select a file to edit
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom: Terminal panel — always rendered, collapsed by default */}
        <ResizablePanel
          panelRef={terminalPanelRef}
          defaultSize="50%"
          collapsible
          onResize={(size) => setShowTerminal(Number(size) > 0)}
        >
          <TerminalPanel output={terminalOutput} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

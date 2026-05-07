"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import type { FileSystemTree, WebContainerProcess } from "@webcontainer/api";

export type WebContainerStatus =
  | "idle"
  | "booting"
  | "mounting"
  | "configuring"
  | "installing"
  | "starting"
  | "ready"
  | "error";

interface UseWebContainerReturn {
  status: WebContainerStatus;
  error: string | null;
  devServerUrl: string | null;
  terminalOutput: string[];
  boot: (files: FileSystemTree) => Promise<void>;
  continueInstall: (packageManager?: string) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  readdir: (path: string, options?: { recursive?: boolean }) => Promise<string[]>;
  getInstance: () => WebContainer | null;
}

// Singleton — only one WebContainer per page
let globalInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const bootWebContainer = async (): Promise<WebContainer> => {
  if (globalInstance) return globalInstance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot();
  globalInstance = await bootPromise;
  bootPromise = null;
  return globalInstance;
};

export const useWebContainer = (): UseWebContainerReturn => {
  const [status, setStatus] = useState<WebContainerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const instanceRef = useRef<WebContainer | null>(globalInstance);
  const devServerProcessRef = useRef<WebContainerProcess | null>(null);

  const appendOutput = useCallback((line: string) => {
    setTerminalOutput((prev) => [...prev, line]);
  }, []);

  const spawnAndLog = useCallback(
    async (
      instance: WebContainer,
      cmd: string,
      args: string[]
    ): Promise<number> => {
      appendOutput(`$ ${cmd} ${args.join(" ")}`);
      const process = await instance.spawn(cmd, args);

      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            const lines = chunk.split("\n").filter(Boolean);
            for (const line of lines) {
              appendOutput(line);
            }
          },
        })
      );

      return process.exit;
    },
    [appendOutput]
  );

  // Phase 1: Boot WebContainer + mount files, then pause at "configuring"
  const boot = useCallback(
    async (files: FileSystemTree) => {
      try {
        setError(null);
        setTerminalOutput([]);

        // Step 1: Boot
        setStatus("booting");
        appendOutput("Booting WebContainer...");
        const instance = await bootWebContainer();
        instanceRef.current = instance;
        appendOutput("WebContainer booted.");

        // Step 2: Mount files
        setStatus("mounting");
        appendOutput("Mounting project files...");
        await instance.mount(files);
        appendOutput("Files mounted.");

        // Pause — wait for env vars configuration
        setStatus("configuring");
        appendOutput("Waiting for environment configuration...");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        appendOutput(`Error: ${message}`);
      }
    },
    [appendOutput]
  );

  // Phase 2: Write .env, install deps, start dev server
  const continueInstall = useCallback(
    async (packageManager = "pnpm") => {
      const instance = instanceRef.current;
      if (!instance) {
        setError("WebContainer not booted");
        setStatus("error");
        return;
      }

      try {
        // Step 3: Install dependencies
        setStatus("installing");
        appendOutput("Installing dependencies...");

        const pm =
          packageManager === "yarn"
            ? "yarn"
            : packageManager === "npm"
              ? "npm"
              : "pnpm";
        const exitCode = await spawnAndLog(instance, pm, ["install"]);

        if (exitCode !== 0) {
          throw new Error(`${pm} install failed with exit code ${exitCode}`);
        }
        appendOutput("Dependencies installed.");

        // Patch: strip --turbopack (unsupported in WebContainer WASM env)
        try {
          const pkgRaw = await instance.fs.readFile("package.json", "utf-8");
          const pkg = JSON.parse(pkgRaw);
          if (pkg.scripts?.dev?.includes("--turbopack")) {
            pkg.scripts.dev = pkg.scripts.dev.replace("--turbopack", "--webpack");
            await instance.fs.writeFile(
              "package.json",
              JSON.stringify(pkg, null, 2)
            );
            appendOutput("Patched dev script: --turbopack → --webpack");
          }
        } catch {
          // Non-critical — project may not have package.json or scripts
        }

        // Step 4: Start dev server
        setStatus("starting");
        appendOutput("Starting dev server...");

        appendOutput(`$ ${pm} dev`);
        const serverProcess = await instance.spawn(pm, ["dev"]);
        devServerProcessRef.current = serverProcess;

        serverProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              const lines = chunk.split("\n").filter(Boolean);
              for (const line of lines) {
                appendOutput(line);
              }
            },
          })
        );

        // Listen for server-ready
        instance.on("server-ready", (_port, url) => {
          appendOutput(`Dev server ready at ${url}`);
          setDevServerUrl(url);
          setStatus("ready");
        });

        // Handle unexpected exit
        serverProcess.exit.then((code) => {
          if (code !== 0) {
            appendOutput(`Dev server exited with code ${code}`);
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        appendOutput(`Error: ${message}`);
      }
    },
    [appendOutput, spawnAndLog]
  );

  const writeFile = useCallback(async (path: string, content: string) => {
    const instance = instanceRef.current;
    if (!instance) throw new Error("WebContainer not booted");
    await instance.fs.writeFile(path, content);
  }, []);

  const readFile = useCallback(async (path: string) => {
    const instance = instanceRef.current;
    if (!instance) throw new Error("WebContainer not booted");
    return await instance.fs.readFile(path, "utf-8");
  }, []);

  const readdir = useCallback(
    async (path: string, options?: { recursive?: boolean }) => {
      const instance = instanceRef.current;
      if (!instance) throw new Error("WebContainer not booted");

      if (options?.recursive) {
        const entries: string[] = [];
        const walk = async (dir: string) => {
          const items = await instance.fs.readdir(dir, {
            withFileTypes: true,
          });
          for (const item of items) {
            const fullPath = dir === "." ? item.name : `${dir}/${item.name}`;
            if (item.isDirectory()) {
              entries.push(fullPath + "/");
              await walk(fullPath);
            } else {
              entries.push(fullPath);
            }
          }
        };
        await walk(path);
        return entries;
      }

      return await instance.fs.readdir(path);
    },
    []
  );

  const getInstance = useCallback(() => instanceRef.current, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      devServerProcessRef.current?.kill();
    };
  }, []);

  return {
    status,
    error,
    devServerUrl,
    terminalOutput,
    boot,
    continueInstall,
    writeFile,
    readFile,
    readdir,
    getInstance,
  };
};

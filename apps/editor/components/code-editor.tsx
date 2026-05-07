"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading editor...</p>
    </div>
  ),
});

const getLanguage = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    mdx: "markdown",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    env: "plaintext",
    sh: "shell",
    bash: "shell",
    sql: "sql",
    graphql: "graphql",
    svg: "xml",
    xml: "xml",
  };
  return map[ext ?? ""] ?? "plaintext";
};

export const CodeEditor = ({
  filePath,
  content,
  onSave,
}: {
  filePath: string;
  content: string;
  onSave: (path: string, content: string) => void;
}) => {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Ctrl+S / Cmd+S to save
      editor.addCommand(
        // eslint-disable-next-line no-bitwise
        2048 | 49, // KeyMod.CtrlCmd | KeyCode.KeyS
        () => {
          const value = editor.getValue();
          onSave(filePath, value);
        }
      );
    },
    [filePath, onSave]
  );

  // Update content when file changes externally (AI edits)
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== content) {
      editor.setValue(content);
    }
  }, [content]);

  return (
    <div className="h-full">
      <MonacoEditor
        height="100%"
        language={getLanguage(filePath)}
        value={content}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          wordWrap: "on",
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 8 },
        }}
      />
    </div>
  );
};

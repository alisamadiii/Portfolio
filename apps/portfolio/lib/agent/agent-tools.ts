import type Anthropic from "@anthropic-ai/sdk";

export const agentTools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file from the project repository. Use this to understand current code before making changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to repository root (e.g. 'components/hero.tsx')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "edit_file",
    description:
      "Create or update a file in the project repository. The full file content must be provided. Changes will be committed to the preview branch.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to repository root",
        },
        content: {
          type: "string",
          description: "The complete new file content",
        },
        commit_message: {
          type: "string",
          description: "A short commit message describing the change",
        },
      },
      required: ["path", "content", "commit_message"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in a directory of the project repository. Use this to discover available files before reading or editing.",
    input_schema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description: "Directory path relative to repository root (e.g. 'components/')",
        },
      },
      required: ["directory"],
    },
  },
];

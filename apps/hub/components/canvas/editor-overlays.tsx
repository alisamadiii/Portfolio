"use client";

import {
  candidatesFor,
  flattenTextValues,
  resolveFieldEntry,
  TEXT_FIELD_TYPES,
} from "@/lib/canvas-entries";
import type { GroupMember } from "@/lib/bridge-messages";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { LinkEditor } from "@/components/canvas/link-editor";
import {
  GroupEditorDialog,
  type GroupEditorFieldRow,
  type GroupEditorSection,
} from "@/components/canvas/group-editor-dialog";

/**
 * Non-text field editors floating above the canvas: the link URL editor and
 * the CMS group modal. Both are driven entirely by the editing engine's state
 * (`useCanvasEditor`), so they work identically to the old inline canvas.
 */
export function EditorOverlays() {
  const {
    entryMap,
    copiesRef,
    groupEditor,
    setGroupEditor,
    linkEditor,
    setLinkEditor,
    commitNonText,
  } = useCanvasEditor();

  return (
    <>
      {groupEditor &&
        (() => {
          const candidates = candidatesFor(entryMap, groupEditor.framePath);
          const valueByPath = new Map<string, string>();
          for (const entry of candidates) {
            const copy = copiesRef.current.get(entry.name);
            if (copy)
              for (const { path, value } of flattenTextValues(copy.values))
                valueByPath.set(path, value);
          }
          const isScalar = (f: Record<string, any>) =>
            TEXT_FIELD_TYPES.has(f.type) || f.type === "image";
          const memberKind = (f: Record<string, any>): GroupMember["kind"] =>
            f.type === "image"
              ? "media"
              : f.type === "string" && f.options?.type === "url"
                ? "link"
                : "text";
          const makeRow = (
            path: string,
            field: Record<string, any> | undefined
          ): GroupEditorFieldRow | null => {
            if (!field || !isScalar(field)) return null;
            const raw = valueByPath.get(path) ?? "";
            return {
              path,
              kind: memberKind(field),
              label: String(
                field.label ?? field.name ?? path.split(".").pop() ?? path
              ),
              value: raw === "NaN" ? "" : raw,
            };
          };

          const hostPath = groupEditor.path;
          const prefix = `${hostPath}.`;
          const hostField = resolveFieldEntry(candidates, hostPath)?.field;
          const childFields: Record<string, any>[] = Array.isArray(
            hostField?.fields
          )
            ? (hostField!.fields as Record<string, any>[])
            : [];

          const indexOf = (path: string): number | null => {
            if (!path.startsWith(prefix)) return null;
            const seg = path.slice(prefix.length).split(".")[0];
            return /^\d+$/.test(seg) ? Number(seg) : null;
          };
          const indices = Array.from(
            new Set(
              groupEditor.members
                .map((m) => indexOf(m.path))
                .filter((i): i is number => i !== null)
            )
          ).sort((a, b) => a - b);

          const sections: GroupEditorSection[] = [];
          const pushRows = (rows: GroupEditorFieldRow[], title?: string) => {
            const seen = new Set<string>();
            const deduped = rows.filter((r) => {
              if (seen.has(r.path)) return false;
              seen.add(r.path);
              return true;
            });
            if (deduped.length) sections.push({ title, rows: deduped });
          };
          const rowsFor = (indexed: number | null) => {
            const rows: GroupEditorFieldRow[] = [];
            for (const child of childFields) {
              const base =
                indexed === null
                  ? `${hostPath}.${child.name}`
                  : `${hostPath}.${indexed}.${child.name}`;
              const row = makeRow(base, child);
              if (row) rows.push(row);
            }
            for (const member of groupEditor.members) {
              if (indexOf(member.path) !== indexed) continue;
              const row = makeRow(
                member.path,
                resolveFieldEntry(candidates, member.path)?.field
              );
              if (row) rows.push(row);
            }
            return rows;
          };

          if (indices.length)
            for (const i of indices)
              pushRows(
                rowsFor(i),
                indices.length > 1 ? `Item ${i + 1}` : undefined
              );
          else pushRows(rowsFor(null));

          return (
            <GroupEditorDialog
              key={`${groupEditor.framePath}:${groupEditor.path}`}
              open
              sections={sections}
              onCommit={(path, value) =>
                commitNonText(groupEditor.framePath, path, value)
              }
              onClose={() => setGroupEditor(null)}
            />
          );
        })()}

      {linkEditor && (
        <LinkEditor
          key={`${linkEditor.framePath}:${linkEditor.path}`}
          value={linkEditor.value}
          onSave={(url) => {
            commitNonText(linkEditor.framePath, linkEditor.path, url);
            setLinkEditor(null);
          }}
          onCancel={() => setLinkEditor(null)}
        />
      )}
    </>
  );
}

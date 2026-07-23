import React, { useEffect, useState } from "react";

import { styles } from "../utils/styles";

interface NotePopupProps {
  element: Element;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
  zIndex: number;
}

export function NotePopup({
  element,
  initialNote,
  onSave,
  onClose,
  zIndex,
}: NotePopupProps) {
  const [note, setNote] = useState(initialNote);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popupHeight = 160;

    const top =
      spaceBelow > popupHeight + 8
        ? rect.bottom + 8
        : rect.top - popupHeight - 8;

    setPosition({
      top: Math.max(8, Math.min(top, window.innerHeight - popupHeight - 8)),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
    });
  }, [element]);

  return (
    <div
      data-devtools-ignore
      style={{
        ...styles.notePopup,
        top: position.top,
        left: position.left,
        zIndex: zIndex + 1,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--muted-foreground)",
          marginBottom: 8,
        }}
      >
        Describe the change you want:
      </div>
      <textarea
        data-devtools-ignore
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g., Make this text larger, change the color..."
        autoFocus
        style={styles.noteTextarea as React.CSSProperties}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            onSave(note);
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
      />
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          data-devtools-ignore
          onClick={onClose}
          style={styles.secondaryButton}
        >
          Skip
        </button>
        <button
          data-devtools-ignore
          onClick={() => onSave(note)}
          style={styles.primaryButton}
        >
          Save
        </button>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--muted-foreground)",
          marginTop: 6,
          textAlign: "right",
        }}
      >
        ⌘+Enter to save
      </div>
    </div>
  );
}

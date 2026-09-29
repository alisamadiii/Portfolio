"use client";

import { useEffect, useMemo, useState } from "react";
import { PaintbrushSparkle } from "@/components/icon";

export type SessionSkill = { name: string; description: string };

/**
 * Plain-Textarea "/" dropdown for the session chat composer — lists the
 * skills shipped in the client repo's .claude/skills. Keyboard events are
 * delegated from the Textarea's onKeyDown (Arrow/Enter/Tab/Escape) while the
 * menu is open; mirrors the TipTap slash menu's look without its editor
 * coupling.
 */
export function SlashSkillsMenu({
  query,
  skills,
  onSelect,
  selectedIndex,
}: {
  query: string;
  skills: SessionSkill[];
  onSelect: (name: string) => void;
  selectedIndex: number;
}) {
  const items = useMemo(() => filterSkills(skills, query), [skills, query]);

  if (!items.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border absolute bottom-full left-0 z-50 mb-1.5 max-h-56 w-full overflow-y-auto rounded-md border p-1 shadow-md">
      {items.map((skill, index) => (
        <button
          key={skill.name}
          type="button"
          onMouseDown={(event) => {
            // mousedown so the Textarea never loses focus
            event.preventDefault();
            onSelect(skill.name);
          }}
          aria-selected={selectedIndex === index}
          className="aria-selected:bg-accent aria-selected:text-accent-foreground relative flex w-full cursor-default items-start gap-2 rounded-sm px-2 py-1.5 text-left outline-none"
        >
          <PaintbrushSparkle className="text-primary mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">/{skill.name}</span>
            {skill.description && (
              <span className="text-muted-foreground block truncate text-[11.5px] leading-snug">
                {skill.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export function filterSkills(skills: SessionSkill[], query: string) {
  const q = query.toLowerCase();
  return skills.filter((skill) => skill.name.toLowerCase().includes(q));
}

/** Shared keyboard state helper for the composer. */
export function useSlashMenuSelection(itemCount: number, query: string) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, itemCount]);
  const move = (delta: number) => {
    if (!itemCount) return;
    setSelectedIndex((current) => (current + delta + itemCount) % itemCount);
  };
  return { selectedIndex, move };
}

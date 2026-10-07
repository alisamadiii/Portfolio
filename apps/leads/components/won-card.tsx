"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

// Deterministic confetti sprinkle (no Math.random — keeps SSR/CSR stable).
// Positions are percentages inside the card, pieces are tiny rotated shapes.
const CONFETTI = [
  { left: "6%", top: "12%", rotate: "18deg", color: "#8b5cf6", round: false },
  { left: "13%", top: "70%", rotate: "-24deg", color: "#f59e0b", round: true },
  { left: "22%", top: "28%", rotate: "40deg", color: "#10b981", round: false },
  { left: "31%", top: "78%", rotate: "-12deg", color: "#3b82f6", round: false },
  { left: "40%", top: "16%", rotate: "65deg", color: "#f43f5e", round: true },
  { left: "49%", top: "62%", rotate: "-40deg", color: "#8b5cf6", round: false },
  { left: "58%", top: "24%", rotate: "12deg", color: "#f59e0b", round: false },
  { left: "67%", top: "74%", rotate: "-60deg", color: "#10b981", round: true },
  { left: "75%", top: "14%", rotate: "30deg", color: "#f43f5e", round: false },
  { left: "83%", top: "58%", rotate: "-18deg", color: "#3b82f6", round: false },
  { left: "91%", top: "30%", rotate: "50deg", color: "#8b5cf6", round: true },
  { left: "96%", top: "72%", rotate: "-35deg", color: "#f59e0b", round: false },
];

export const WonCard = () => {
  const trpc = useTRPC();
  const won = useQuery(trpc.leads.won.queryOptions());
  const rows = won.data ?? [];

  return (
    <div className="bg-card relative flex h-80 flex-col overflow-hidden rounded-3xl p-6 shadow-sm sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
      >
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className={`absolute ${piece.round ? "size-1.5 rounded-full" : "h-2.5 w-1.5 rounded-[2px]"}`}
            style={{
              left: piece.left,
              top: piece.top,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotate})`,
              opacity: 0.55,
            }}
          />
        ))}
      </div>

      <div className="relative mb-4 flex items-center gap-3">
        <span className="icon-chip bg-amber-100 text-amber-600">
          <Trophy />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">Won clients</h2>
        {rows.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {rows.length} {rows.length === 1 ? "win" : "wins"}
          </span>
        )}
      </div>

      {!rows.length ? (
        <p className="text-muted-foreground relative text-sm">
          {won.isLoading
            ? "Loading…"
            : "No wins yet. Move a lead to the won stage and it celebrates here."}
        </p>
      ) : (
        <ul className="relative min-h-0 flex-1 space-y-1 overflow-y-auto">
          {rows.map((client) => (
            <li key={client.id}>
              <Link
                href={`/scans/${client.scanId}?lead=${client.id}`}
                className="hover:bg-muted/70 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[client.category, client.address]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {client.updatedAt && (
                  <span className="bg-emerald-100 text-emerald-700 shrink-0 rounded-full px-3 py-1 text-xs font-medium">
                    Won {new Date(client.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import { setHubView } from "@/app/(main)/(hub)/view-actions";
import { Globe, Megaphone } from "@/components/icon";
import type { HubView } from "@/lib/hub-view";

const HubViewContext = createContext<{ view: HubView }>({ view: "website" });

export function useHubView() {
  return useContext(HubViewContext);
}

export function HubViewProvider({
  view,
  children,
}: {
  view: HubView;
  children: React.ReactNode;
}) {
  return (
    <HubViewContext.Provider value={{ view }}>
      {children}
    </HubViewContext.Provider>
  );
}

const OPTIONS: { value: HubView; label: string; icon: typeof Globe }[] = [
  { value: "agency", label: "Agency", icon: Megaphone },
  { value: "website", label: "Website", icon: Globe },
];

/**
 * Segmented switch between the agency and website UIs. Only agency clients
 * see it; a plain website user has nothing to switch to. Picking a side saves
 * the choice and reloads so the server re-picks the slot.
 */
export function ViewSwitch() {
  const { view } = useHubView();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const pick = (next: HubView) => {
    if (next === view || pending) return;
    startTransition(async () => {
      await setHubView(next);
      // Both trees have a home route; land there so we never ask one tree for
      // a route that only exists in the other.
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "bg-sidebar-foreground/8 mt-3.5 flex rounded-[11px] p-0.5",
        pending && "opacity-60"
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.value === view;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            onClick={() => pick(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-1.5 text-[12.5px] font-semibold transition-colors",
              active
                ? "bg-sidebar text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className={cn("size-3.5", active && "text-[#fc8464]")} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

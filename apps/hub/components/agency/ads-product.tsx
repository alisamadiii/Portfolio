"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import { projectSubpath } from "@/lib/paths";
import { agencyHref, useAgency } from "@/components/agency/use-agency";

export type AdsProduct = "search" | "lsa";

type AdsProductState = {
  product: AdsProduct;
  setProduct: (product: AdsProduct) => void;
};

const AdsProductContext = createContext<AdsProductState>({
  product: "search",
  setProduct: () => {},
});

export const useAdsProduct = () => useContext(AdsProductContext);

// Search-only marketing routes disappear in LSA mode, and vice versa.
const SEARCH_ONLY = [
  "/marketing/conversions",
  "/marketing/budget",
  "/marketing/search-terms",
];
const LSA_ONLY = ["/marketing/lsa"];

/**
 * Which ads product the marketing pages show. Forced by the client's adsType;
 * only "both" clients get the sidebar switch. Mirrors CampaignFilterProvider:
 * sessionStorage so the pick survives navigation but not a new visit.
 */
export function AdsProductProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { repoId, adsType } = useAgency();
  const key = `ads-product:${repoId}`;
  const [stored, setStored] = useState<AdsProduct>("search");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved === "lsa" || saved === "search") setStored(saved);
    } catch {
      /* private mode */
    }
  }, [key]);

  const product: AdsProduct =
    adsType === "lsa" ? "lsa" : adsType === "both" ? stored : "search";

  const value = useMemo<AdsProductState>(
    () => ({
      product,
      setProduct: (next) => {
        setStored(next);
        try {
          sessionStorage.setItem(key, next);
        } catch {
          /* private mode */
        }
      },
    }),
    [product, key]
  );

  return (
    <AdsProductContext.Provider value={value}>
      {children}
    </AdsProductContext.Provider>
  );
}

/** Sidebar segmented switch between Google Ads and Local Services. */
export function AdsProductSwitch() {
  const { repoId, adsType } = useAgency();
  const { product, setProduct } = useAdsProduct();
  const pathname = usePathname();
  const router = useRouter();

  if (adsType !== "both") return null;

  const switchTo = (next: AdsProduct) => {
    setProduct(next);
    // Leave a page the other mode doesn't have.
    const hidden = next === "lsa" ? SEARCH_ONLY : LSA_ONLY;
    if (hidden.some((route) => projectSubpath(pathname).startsWith(route))) {
      router.push(agencyHref(repoId, "/marketing"));
    }
  };

  return (
    <div className="px-3 pt-1 pb-1">
      <p className="text-sidebar-foreground/60 px-0.5 pb-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
        Ads product
      </p>
      <div className="bg-sidebar-accent/60 flex gap-0.5 rounded-md p-0.5">
        {(
          [
            { value: "search", label: "Google Ads" },
            { value: "lsa", label: "Local Services" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={product === option.value}
            onClick={() => switchTo(option.value)}
            className={cn(
              "flex-1 rounded-[5px] px-2 py-1 text-[12px] font-medium transition-colors",
              product === option.value
                ? "bg-sidebar text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// app/(marketing)/_sections/mobile.tsx
import { Check } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";

const mobileFeatures = [
  "Expo 55 with React Native and typed routing",
  "WebView auth: user logs in via web UI, session token returned to native via postMessage",
  "Secure token storage with expo-secure-store",
  "Same tRPC API, same type safety, bearer auth header",
  "Subscription management via Polar portal (system browser)",
  "Light/dark theme with useColorScheme",
  "Splash screen management until auth state resolves",
  "React Compiler enabled for performance",
];

export function MobileSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-16 lg:grid-cols-2">
          {/* Left content */}
          <div>
            <Badge
              variant="secondary"
              className="mb-4 rounded-full px-3 py-1 text-xs"
            >
              Mobile
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Web + Mobile from the Same Codebase
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              A full Expo app that shares your auth, API, and type definitions.
              Not a wrapper — a real native experience.
            </p>
            <ul className="mt-8 space-y-3">
              {mobileFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — mock phone frame */}
          <div className="flex justify-center">
            <div className="relative mx-auto w-64">
              {/* Phone bezel */}
              <div className="border-foreground/10 bg-card rounded-[2.5rem] border-4 p-2 shadow-2xl">
                {/* Notch */}
                <div className="bg-foreground/10 mx-auto mb-2 h-5 w-24 rounded-full" />
                {/* Screen */}
                <div className="bg-muted/50 space-y-4 rounded-[2rem] p-6">
                  <div className="bg-primary/20 h-4 w-24 rounded" />
                  <div className="bg-muted-foreground/10 h-3 w-full rounded" />
                  <div className="bg-muted-foreground/10 h-3 w-3/4 rounded" />
                  <div className="mt-4 space-y-2">
                    <div className="bg-card flex items-center gap-2 rounded-lg p-3">
                      <div className="bg-primary/10 size-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="bg-foreground/10 h-2.5 w-20 rounded" />
                        <div className="bg-muted-foreground/10 h-2 w-28 rounded" />
                      </div>
                    </div>
                    <div className="bg-card flex items-center gap-2 rounded-lg p-3">
                      <div className="size-8 rounded-full bg-emerald-500/10" />
                      <div className="flex-1 space-y-1">
                        <div className="bg-foreground/10 h-2.5 w-24 rounded" />
                        <div className="bg-muted-foreground/10 h-2 w-20 rounded" />
                      </div>
                    </div>
                    <div className="bg-card flex items-center gap-2 rounded-lg p-3">
                      <div className="size-8 rounded-full bg-violet-500/10" />
                      <div className="flex-1 space-y-1">
                        <div className="bg-foreground/10 h-2.5 w-16 rounded" />
                        <div className="bg-muted-foreground/10 h-2 w-24 rounded" />
                      </div>
                    </div>
                  </div>
                  {/* Tab bar */}
                  <div className="bg-card mt-4 flex justify-around rounded-xl p-2">
                    <div className="bg-primary/20 size-6 rounded" />
                    <div className="bg-muted-foreground/10 size-6 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Create a new animation for the Motion showcase app.

## Step 1 — Ask the user

Before doing anything, use the `AskUserQuestion` tool to prompt the user with these two questions:

**Question 1: "What type of animation do you want to create?"**
Options:
- **iOS / Mobile** — iPhone mockup with gestures, transitions, and native-feeling interactions (Dynamic Island, settings, profiles, messaging)
- **Website / SaaS** — Standalone card or layout with web-inspired micro-interactions (bento grids, status boards, toasts, command palettes)
- **Canvas / Generative** — Particle systems, dot grids, waveforms, heatmaps, and generative visual art using HTML canvas
- **Component / UI** — Interactive UI components with satisfying animations (expandable cards, drag-to-reorder, spring toggles, morphing buttons)

**Question 2: "Do you have a specific idea, or should I come up with one?"**
Options:
- **I have an idea** — I'll describe what I want
- **Surprise me** — Come up with something creative and shareable on X/Twitter

If the user picks "I have an idea", wait for them to describe it before proceeding.

**Question 3 (only for Component / UI type): "Should the animation auto-play or be triggered by interaction?"**
Options:
- **Auto-play** — Loops automatically, great for showcases and passive demos
- **Click to interact** — User clicks/taps to trigger the animation (best for buttons, toggles, interactive UI)

Skip this question for iOS/Mobile, Website/SaaS, and Canvas/Generative types (they default to auto-play). Also skip if the user already described the interaction model.

If the user already described their idea in the initial message (before the command ran), skip the questions and proceed directly.

---

## Step 2 — Build

1. **Ideate** — Based on the user's choices, decide on the animation concept
2. **Build** — Create `apps/motion/animations/<slug>/index.tsx` with the animation component
3. **Register** — Add entries to both `registry.tsx` and `metadata.ts`
4. **Verify** — Confirm it renders at `http://localhost:3002/<slug>`

---

## Inspiration & Ideas

Draw from real, polished apps and websites. Study how top companies handle micro-interactions, then recreate them with Motion:

**iOS / Apple**
- Dynamic Island morphing, lock screen notifications, App Store card expansion
- Settings toggles, Control Center sliders, photo gallery gestures
- Spring-loaded drag-to-dismiss, rubber-band overscroll, haptic-like bounces

**Messaging apps**
- Telegram: swipe-to-reply, expandable profile headers, message reactions
- Slack: profile view transitions, channel switching, status indicators
- Instagram: story ring animations, profile photo expansion, double-tap heart

**Web / SaaS**
- Stripe: animated dashboard grids, payment flow transitions, icon morphing
- Linear: smooth list reordering, status transitions, command palette
- Vercel: deploy status animations, tab transitions, card hover effects

**Where to find ideas**
- 60fps.design — curated mobile interaction recordings
- X/Twitter motion designers: @nitishkmrk, @sekachov
- Dribbble — search "micro interaction", "motion design", "UI animation"

**What makes a great animation**
- A single, satisfying interaction: expand/collapse, drag-to-dismiss, staggered reveal, morphing shapes
- Feels physical — spring physics, momentum, elastic overshoot
- Loops well for screen recording (auto-cycles back to initial state)
- Immediately recognizable — viewers should think "oh, that's like [app]!"

Always set the `from` field in the registry to credit the original inspiration URL.

---

## Rules

### Imports

```tsx
// Motion — ALWAYS use "motion/react", never "framer-motion"
import { motion, AnimatePresence, MotionConfig } from "motion/react"

// Utilities
import { cn } from "@workspace/ui/lib/utils"

// Icons
import { IconName } from "lucide-react"

// UI components (use as needed)
import { Button } from "@workspace/ui/components/button"
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/ui/components/avatar"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Card } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import { Label } from "@workspace/ui/components/label"

// iPhone mockup (only for iOS-inspired animations)
import { Iphone } from "@zuude-ui/ios-mockups"

// Measurement (for auto-height animations)
import useMeasure from "react-use-measure"
```

### Colors — STRICT: only shadcn CSS variables

You may ONLY use these design system colors. No exceptions:

```
background, foreground
card, card-foreground
popover, popover-foreground
primary, primary-foreground
secondary, secondary-foreground
muted, muted-foreground
accent, accent-foreground
destructive, destructive-foreground
border, input, ring
```

**Tailwind usage:**
```
bg-background, bg-foreground, bg-primary, bg-secondary, bg-muted, bg-accent, bg-card, bg-destructive
text-foreground, text-muted-foreground, text-primary-foreground, text-card-foreground, text-accent-foreground
border-border, border-primary, border-input
ring-ring
```

**Inline styles:** `var(--primary)`, `var(--muted-foreground)`, `var(--border)`, etc.

**FORBIDDEN — never use random Tailwind colors:**
- No `bg-blue-500`, `text-green-400`, `from-violet-500`, `bg-neutral-700`, `text-orange-400`, etc.
- No hardcoded hex values (`#FF5996`, `#11EFE3`)
- No `rgba()` with hardcoded color values

**Only exception:** `bg-black` / `text-white` for elements that are inherently black/white regardless of theme (e.g., the Dynamic Island pill is always black).

**How to handle semantic needs:**
- Error/decline → `destructive`
- Success/accept → `primary`
- Subtle/secondary → `muted`, `secondary`
- Emphasis → `accent`
- Borders/dividers → `border`

### Images — available logos

When images are needed, always use the CDN URLs directly (never import from a module — users copy-pasting the code won't have access to internal imports):

```
https://cdn.alisamadii.com/company/business-logo.png        (default)
https://cdn.alisamadii.com/company/business-logo-blue.png
https://cdn.alisamadii.com/company/business-logo-black.png
https://cdn.alisamadii.com/company/business-logo-yellow.png
https://cdn.alisamadii.com/company/business-logo-purple.png
https://cdn.alisamadii.com/company/business-logo-green.png
```

Do NOT use `import { logos } from "@workspace/ui/lib/company"` — always inline the CDN URL string.

### Sample data — use real products as inspiration

When an animation needs placeholder data (product lists, cards, items), draw from Ali's actual projects instead of generic filler. Use `projectsData` in `packages/ui/src/lib/company.ts` as a reference:

| Name | Logo variant | Description |
|------|-------------|-------------|
| Motion | blue | A production-ready motion library for React |
| Agency | default | A production-ready agency website for your business |
| Docs | yellow | A website to add useful information |
| Template | black | A template for starting a new project |

Match each logo variant to its CDN URL above. This keeps demo data on-brand instead of random coffee shops or placeholder names.

### Component structure

- **Default export**, no props — components are fully self-contained
- Sub-components defined in the same file (or split into helper files only if complex)
- All state managed locally with `useState`, `useRef`, `useEffect`
- **Always clean up** timeouts/intervals in `useEffect` return

```tsx
export default function AnimationName() {
  const [state, setState] = useState(...)

  useEffect(() => {
    const timer = setInterval(() => { ... }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
      {/* animation content */}
    </MotionConfig>
  )
}
```

### Animation techniques

- **Spring transitions** are the default: `{ type: "spring", bounce: 0 }` to `{ type: "spring", bounce: 0.4 }`
- Wrap in **`MotionConfig`** to set global transition defaults — once set, do NOT add inline `transition` props on individual elements unless the transition is meaningfully different (e.g., a continuous rotation vs the global spring). Redundant or slightly tweaked transitions defeat the purpose of `MotionConfig`
- Use **`AnimatePresence mode="popLayout"`** for enter/exit (most common), or `mode="wait"`
- Use **`layout`** prop on `motion.*` elements for automatic layout animation
- Use **`layoutId`** for shared element transitions between states
- Content transitions: fade + blur is the standard pattern:
  ```tsx
  initial={{ opacity: 0, filter: "blur(6px)" }}
  animate={{ opacity: 1, filter: "blur(0px)" }}
  exit={{ opacity: 0, filter: "blur(6px)" }}
  ```
- **Animate container heights** — never let containers jump in size. Use `useMeasure` from `react-use-measure` to track content height, then animate with `motion.div`:
  ```tsx
  const [ref, { height }] = useMeasure()
  <motion.div animate={{ height: height > 0 ? height : "auto" }}>
    <div ref={ref}>{/* content */}</div>
  </motion.div>
  ```
  This applies to any container whose children add/remove dynamically (lists, columns, expandable sections).
- For drag interactions: `drag="y"`, `dragConstraints`, `dragElastic`, `onDragEnd`
- For scroll-driven: `useScroll`, `useTransform`, `useMotionValueEvent`
- **Canvas animations** — use `<canvas>` with `useRef` + `useEffect` + `requestAnimationFrame` for advanced visuals like particle systems, dot grids, waveforms, heatmaps, and generative art. Canvas is ideal when DOM-based animation would require too many elements (100+ particles, pixel-level effects). Pattern:
  ```tsx
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // draw particles, grids, waves, etc.
      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animationId)
  }, [])

  return <canvas ref={canvasRef} width={...} height={...} />
  ```
  For colors in canvas, read CSS variables at runtime:
  ```tsx
  const styles = getComputedStyle(canvas)
  const primary = styles.getPropertyValue("--primary").trim()
  const muted = styles.getPropertyValue("--muted-foreground").trim()
  ```
  Canvas can be combined with Motion — wrap the canvas in a `motion.div` for enter/exit animations, or overlay Motion elements on top of a canvas background.

### iPhone mockup (optional)

Use for iOS/mobile-inspired animations. Skip for web-inspired ones.

```tsx
<Iphone className="[--screen-color:var(--background)]!" size="md">
  {/* screen content */}
</Iphone>
```

- Available sizes: `"sm"`, `"md"`, `"lg"`
- Override screen color with `[--screen-color:...]!`
- Top safe area: `pt-(--top-safe-area)`
- The Iphone component renders a built-in dynamic island — hide it with `style={{ '--dynamic-island-color': 'transparent' } as any}` if building your own

### Styling

- **Tailwind CSS only** — no CSS modules, no styled-components
- Use `cn()` for conditional class merging
- Inline `style` only for: motion values, dynamic grid areas, perspective, borderRadius overrides
- Sizing: prefer `max-w-*` (max-w-sm, max-w-lg, max-w-80) over fixed widths
- Rounding: `rounded-xl`, `rounded-2xl`, `rounded-full` are most common
- Shadows: `shadow-md`, `shadow-xl`, `shadow-2xl`
- Images: always set `aspect-*` and `object-cover`

### Comments — minimal

- Keep comments to an absolute minimum — the code should speak for itself
- Only comment when the logic is genuinely non-obvious (e.g., a math formula for arc positioning)
- Never add section divider comments like `{/* Header */}`, `{/* Bottom section */}`, `{/* Product info */}`
- The single-line comment at the top of the file describing the animation is enough

### Preferences — Ali's taste

These aren't hard rules — they're sensibilities. Apply them with judgment based on what the animation needs.

- **Lean toward simplicity** — if the animation doesn't need a header, nav bar, or extra action buttons, leave them out. Focus on the core interaction. Exception: when replicating a full app screen (iOS settings, Telegram reply), the chrome is part of the concept
- **Flatten DOM when possible** — prefer styling elements directly over wrapping in extra divs. Nesting is fine when it serves layout or accessibility, but every unnecessary wrapper is a sign to simplify
- **Blur on transitions** — adding `filter: "blur(12px)"` to enter/exit of sliding/swapping elements often makes transitions feel richer. Consider it for slide variants, not just text content
- **Start with `bounce: 0`** — it's a cleaner default. Only increase bounce when the concept specifically calls for it (playful toggles, spring pulls, elastic effects)
- **Static over animated when the visual result is the same** — a fixed ring indicator can look identical to an animated `layoutId` ring. Use animated elements only when the movement itself adds to the experience
- **`<AnimatePresence initial={false}>`** — wrap the root when the animation shouldn't play on mount (common for click-triggered). Not needed for auto-cycling animations that play immediately

### Reusability — copy-paste friendly

Every animation should be portable. A user should be able to copy the file into their own project and have it work with minimal setup:

- **Self-contained** — keep everything in a single `index.tsx` file when possible (split only if truly complex)
- **Standard dependencies only** — rely on packages users likely already have: `motion/react`, `lucide-react`, `tailwindcss`
- **Shadcn UI components are OK** (Button, Avatar, Input, etc.) since most users have them — but prefer plain HTML elements (`div`, `button`, `span`) when a shadcn component isn't adding real value to the animation
- **`cn()` is fine** — it's standard in every shadcn project
- **No other project-specific utilities** — no internal helpers, hooks, or libs beyond what's listed above
- **Images as CDN URLs** — never import from internal modules (already covered above)
- **No backend dependencies** — no API calls, auth, tRPC, or database access
- **Brief comment at top** — one line describing what the animation does, e.g.: `// Expandable iOS-style card with spring drag-to-dismiss`
- **The `<Iphone>` mockup is NOT copy-paste friendly** — it's a project-specific package. When using it, the animation logic inside should still be extractable without the wrapper

### Animation trigger modes

Not all animations should auto-play. Choose the right trigger mode based on what the animation represents:

#### Auto-cycling (default for showcase/generative)

Best for: canvas/generative art, scroll-driven effects, reveals, transitions, passive visual demos.

Since these are often screen-recorded for X/Twitter:
- Use `useEffect` + `setInterval`/`setTimeout` to auto-cycle
- Typical cycle: 2–3.5 seconds per state
- Add slight delays between states (1–1.5s idle) so viewers can follow
- Stagger child animations with index-based delays (80–200ms per item)

#### Click-triggered (for interactive UI components)

Best for: buttons, toggles, expandable cards, morphing elements — anything where the user interaction IS the animation.

When the animation represents an interactive element, **the user must click/tap to trigger it**. Do NOT auto-cycle these with `useEffect`. The animation should:
- Start in an idle/resting state
- Play through its sequence when clicked
- Reset to idle after the sequence completes (so it can be triggered again)
- Use `animate` props driven by state (not `useEffect`) and set `initial={false}` so the component doesn't animate on mount — it should render silently in its resting state and only animate when the user interacts

```tsx
export default function ClickTriggeredExample() {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle")

  const handleClick = () => {
    if (state !== "idle") return // prevent re-trigger mid-animation
    setState("loading")
    setTimeout(() => setState("success"), 1500)
    setTimeout(() => setState("idle"), 3500)
  }

  return (
    <motion.button onClick={handleClick}>
      {/* animate based on state */}
    </motion.button>
  )
}
```

This still loops well for screen recording — the viewer just sees a click, the animation plays, it resets, and can be clicked again.

---

## Registration

### registry.tsx

Add to the `animations` object in `apps/motion/animations/registry.tsx`:

```tsx
"<slug>": {
  id: "<generate-a-uuid>",
  name: "<Display Name>",
  description: "",
  component: dynamic(
    () => import("./<slug>/index"),
    { ssr: false, loading: () => <AnimationLoading /> }
  ),
  image: "",
  darkImage: "",
  isPremium: false,
  from: "",
},
```

### metadata.ts

Add to the `animationsMetadata` object in `apps/motion/animations/metadata.ts`:

```tsx
"<slug>": {
  name: "<Display Name>",
  description: "",
  image: "",
},
```

Leave `image` and `darkImage` empty — screenshots are added after deployment.

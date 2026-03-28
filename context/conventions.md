# Code Conventions

## File layout order

1. Imports
2. Types / constants
3. **Main exported component** (always before sub-components)
4. Local sub-components (below the main export)

## Component splitting

Keep everything in one file unless ALL three are true:

1. 200+ lines
2. Independent data fetching (its own `useQuery` to a different endpoint)
3. Meaningfully reusable or unrelated in concern

If multiple sub-components share one `useQuery` — keep them in the same file.

## Popover / Dialog / AlertDialog — Content sub-component

Whenever a `Popover`, `Dialog`, or `AlertDialog` contains hooks or logic, extract the inner content into a co-located `Content` sub-component in the **same file**. The parent only owns open/close state and renders `{isOpen && <Content onClose={...} />}` (or the dialog equivalent). This ensures hooks and heavy logic only run when the overlay is actually open.

```tsx
// ✓ correct — hooks live in Content, only mount when open
export const DeleteUserDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
         <Content onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

const Content = ({ onClose }: { onClose: () => void }) => {
  const deleteUser = useMutation(trpc.user.delete.mutationOptions());
  // all logic here
};

// ✗ wrong — hooks run unconditionally in the parent
export const DeleteUserDialog = () => {
  const deleteUser = useMutation(...); // runs even when dialog is closed
  const [open, setOpen] = useState(false);
  ...
};
```

## Page files

Pages import and render section components only — no data fetching, no inline logic.

## UI components — always use shadcn

Always reach for an existing shadcn component before writing any custom UI. Never build a raw HTML element when a shadcn primitive covers it.

Available components in `@/components/ui/`:

`alert` · `alert-dialog` · `avatar` · `badge` · `button` · `card` · `checkbox` · `dialog` · `dropdown-menu` · `field` · `input` · `input-group` · `input-otp` · `label` · `popover` · `select` · `separator` · `skeleton` · `sonner` · `spinner` · `table` · `textarea`

**Rules:**

- Use `Button` — never `<button>`
- Use `size="icon"` on `Button` whenever the button contains only an icon and no label
- Use `Input` — never `<input>`
- Use `Card` for any boxed content sections
- Use `Dialog` / `AlertDialog` for modals and confirmations
- Use `Skeleton` for loading states — never a custom spinner (use `Spinner` only for inline/button loading)
- Use `Badge` for status labels
- Use `DropdownMenu` for action menus
- If a component you need is not in the list, install it with `pnpm dlx shadcn@latest add <component>` — do not build it from scratch

## Tables

Always use `<DataTable>` from `@/components/data-table`. Never build a raw `<Table>`.
Columns go in a co-located `columns.tsx` file next to the page.

```
app/admin/products/
  page.tsx
  columns.tsx
```

## tRPC pattern

```tsx
const trpc = useTRPC();
const { data, isPending } = useQuery(trpc.router.procedure.queryOptions());
const createSomething = useMutation(trpc.router.procedure.mutationOptions());
// access: createSomething.mutate(), createSomething.isPending, createSomething.isError
```

Never call `fetch` directly. All internal data goes through tRPC.

## Forms

Always use React Hook Form + Zod. Never use uncontrolled inputs or `useState` for form state.

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

- Schema always defined with Zod, co-located with the form component
- Use `Field` + `Input` + `Label` from shadcn for form fields
- Submit button uses `isPending` from the mutation — show `<Spinner />` inside it

## Loading and error states

- Use `<Skeleton />` for initial data loading (page-level, list-level)
- Use `<Spinner />` only for inline actions (inside buttons, small inline areas)
- Never show a blank screen — always render a skeleton that matches the layout
- For errors: use `sonner` toast for transient errors, inline message for form validation errors

## Toasts (Sonner)

```tsx
import { toast } from "sonner";

toast.success("Saved");
toast.error("Something went wrong");
```

- Success actions → `toast.success`
- Failed mutations → `toast.error`
- Never use `alert()` or custom modal for transient feedback

## Tailwind utilities

- Always use `dvh` for viewport height — never `vh`
- Always use `size-*` when width and height are equal — never `w-* h-*`
- Always use the `!` important suffix at the **end** of a class — never the `!` prefix

```tsx
// ✓ correct
<div className="min-h-dvh" />
<div className="h-dvh" />
<div className="size-6" />
<div className="size-full" />
<div className="mb-0!" />

// ✗ wrong
<div className="min-h-screen" />
<div className="h-screen" />
<div className="h-6 w-6" />
<div className="h-full w-full" />
<div className="!mb-0" />
```

## className — always use cn

Always use `cn()` from `@/lib/utils` for any dynamic or conditional className. Never use template literals or inline ternaries in className strings.

```tsx
// ✓ correct
<div className={cn("base", isActive && "active", variant === "x" && "x-class")} />

// ✗ wrong
<div className={`base ${isActive ? "active" : ""}`} />
<div className={"base " + (isActive ? "active" : "")} />
```

## Color tokens

**Never use arbitrary Tailwind colors.** No `text-gray-500`, no `bg-blue-600`, no `text-red-400`. Always use shadcn CSS variable tokens. This is a hard rule — no exceptions.

If a color you need isn't in the list below, use the closest semantic token. Never invent a color.

| Token                                            | Usage                                          |
| ------------------------------------------------ | ---------------------------------------------- |
| `bg-background` / `text-foreground`              | Page background and default text               |
| `bg-card` / `text-card-foreground`               | Card surfaces                                  |
| `bg-popover` / `text-popover-foreground`         | Popovers, dropdowns                            |
| `bg-primary` / `text-primary-foreground`         | Primary actions, active state                  |
| `bg-secondary` / `text-secondary-foreground`     | Secondary actions                              |
| `bg-muted` / `text-muted-foreground`             | Subtle backgrounds, placeholder text, captions |
| `bg-accent` / `text-accent-foreground`           | Hover states, highlights                       |
| `bg-destructive` / `text-destructive-foreground` | Errors, delete actions                         |
| `border`                                         | Default borders                                |
| `ring`                                           | Focus rings                                    |
| `input`                                          | Input borders                                  |

**Examples:**

```tsx
// ✓ correct
<p className="text-muted-foreground" />
<div className="bg-card border" />
<button className="bg-primary text-primary-foreground" />
<span className="text-destructive" />

// ✗ wrong
<p className="text-gray-500" />
<div className="bg-white border-gray-200" />
<button className="bg-blue-600 text-white" />
<span className="text-red-500" />
```

## Tech stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · tRPC · Drizzle ORM · pnpm

## Coding rules

### Rule 1 — Arrow functions only

Never use the bare `function` keyword for component definitions or utility functions.

```tsx
// ✓ correct
const Button = (props: ButtonProps) => { ... };
const formatDate = (date: Date) => { ... };

// ✗ wrong
function Button(props: ButtonProps) { ... }
function formatDate(date: Date) { ... }
```

**Exceptions** — leave these as-is, do not convert:

- `generateMetadata`, `generateStaticParams`
- Route handlers: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Middleware
- Email templates in `services/email/emails/` (see Rule 2)

### Rule 2 — Named exports only — no `export default`

```tsx
// ✓ correct
export const UserCard = () => { ... };

// ✗ wrong
export default function UserCard() { ... }
export default UserCard;
```

**Exceptions** — keep default exports for:

- Next.js page, layout, and route files inside `app/` (Next.js requires it)
- Email templates in `services/email/emails/*.tsx` — React Email's preview system requires `export default function`. These files may also use the `.PreviewProps` static property on the function. Do not convert them to named exports or arrow functions.

### Rule 3 — File names must be kebab-case

All component, hook, and utility files use kebab-case. Convert the primary export name:

| Wrong                  | Correct              |
| ---------------------- | -------------------- |
| `UserCard.tsx`         | `user-card.tsx`      |
| `DataTableWrapper.tsx` | `data-table.tsx`     |
| `useMyHook.tsx`        | `use-my-hook.ts`     |
| `index.tsx` (generic)  | `component-name.tsx` |

Never use PascalCase, camelCase, snake_case, or compound words without hyphens. Never name a file `index.tsx` generically.

### Quick reference

| Rule       | Wrong                    | Right                       |
| ---------- | ------------------------ | --------------------------- |
| Functions  | `function Button(props)` | `const Button = (props) =>` |
| Exports    | `export default Button`  | `export const Button = ...` |
| Files      | `UserCard.tsx`           | `user-card.tsx`             |
| Apostrophe | `We'll` in JSX           | `We&apos;ll`                |

## Content (Markdown / MDX)

Use **`@content-collections/core`** for all Markdown content. Collections are defined in `content-collections.ts` at the root. Each collection compiles MDX, extracts headings, and exports a typed `allX` array from the virtual `content-collections` module.

- Add a new collection with `defineCollection` in `content-collections.ts`
- Place content files in `content/<collection-directory>/`
- Import with `import { allBlog } from "content-collections"` (name follows the collection `name` field)
- Access processed MDX via `post.mdx`, render with `<MDXContent code={post.mdx} />` from `@content-collections/mdx/react`
- Static routes should call `generateStaticParams` using the collection array

## Database schema changes

Edit `services/db/schema.ts` freely. Never run `pnpm drizzle-kit push` or any other database command — Ali runs those himself.

## Before writing code

1. Read relevant existing files first — never assume what's there
2. Check if a shared component already exists before creating one
3. New admin data → add to `services/trpc/routers/admin/` using `adminProcedure`
4. Table UI → use `DataTable` + `columns.tsx`

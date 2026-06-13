import type { MouseEvent } from 'react'

export const MONO = "'Geist Mono', monospace"
export const CMD = 'npx create-saaskit-app@latest'
export const MOBILE_BP = 880
export const MID_BP = 1180
export const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3CENMMqOqkWoMyVjhVb2YYjmMhY/hf_20260612_024313_6e87a54c-8536-493f-8a3f-a52d8ccc6d1b.mp4'

export const TRUST = [
  'Next.js 16',
  'TypeScript',
  'Tailwind CSS',
  'shadcn/ui',
  'Drizzle',
  'Neon',
  'Better Auth',
  'Polar',
  'React Query',
]

export const FAQS = [
  {
    q: "What's the difference between the two templates?",
    a: 'Full-Stack is a single Next.js app — everything in one place, the fastest path to live. Monorepo is a Turborepo workspace that splits the same stack into apps (web, mobile, API) and shared packages (UI, db, config). Same integrations, different shape: pick Full-Stack for a first product, Monorepo when several apps will share code.',
  },
  {
    q: "What's the tech stack?",
    a: 'Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM on Neon Postgres, Better Auth for authentication, Polar for payments and billing, and React Query for data fetching. No exotic dependencies — everything is documented and replaceable.',
  },
  {
    q: 'Do I get updates after buying?',
    a: 'Yes. Every purchase includes lifetime access to the private repo. When the stack moves — a Next.js major, a Better Auth release, a Polar API change — the template is updated and you pull the changes.',
  },
  {
    q: 'Can I use it for client projects?',
    a: "Yes. The license covers unlimited personal and client projects. The only thing you can't do is resell or redistribute the template itself.",
  },
  {
    q: 'Is there a license / can I resell?',
    a: 'Each purchase is a per-developer license; the Bundle covers teams of up to 10. You can ship unlimited products built on it — you just can’t republish the source as a competing template or starter.',
  },
  {
    q: 'Do I need to be an expert to use it?',
    a: "If you're comfortable with React and TypeScript, you're the target user. The README walks through env setup in about ten minutes, and the codebase is deliberately boring — no clever abstractions to reverse-engineer.",
  },
  {
    q: 'How do I get support?',
    a: 'Every license includes access to the private Discord. Bundle customers get a priority channel with same-day answers from the maintainer.',
  },
]

export function noop(e: MouseEvent) {
  e.preventDefault()
}

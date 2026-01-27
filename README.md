# Monorepo Template

A production-ready monorepo template built with modern technologies, featuring authentication, payments, file storage, and more.

## 🚀 Tech Stack

### Core Framework

- **Next.js 16** - React framework with App Router and Turbopack
- **React 19** - UI library
- **TypeScript 5.9** - Type safety

### Monorepo & Build Tools

- **Turborepo** - High-performance build system
- **pnpm** - Fast, disk space efficient package manager
- **Turbo** - Incremental builds and caching

### UI & Styling

- **shadcn/ui** - Re-usable component library built with Radix UI
- **Radix UI** - Accessible, unstyled component primitives
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### State Management & Data Fetching

- **TanStack Query (React Query)** - Server state management
- **tRPC** - End-to-end typesafe APIs
- **Zod** - Schema validation and type inference

### Authentication

- **Better Auth** - Modern authentication library
- **Better Auth Polar Plugin** - Payment integration

### Database & ORM

- **PostgreSQL** - Database (works with Neon, Supabase, etc.)
- **Drizzle ORM** - TypeScript ORM with SQL-like syntax
- **Neon HTTP** - Serverless PostgreSQL driver

### Payments

- **Polar** - Payment and subscription management

### Storage

- **AWS S3** - File storage via AWS SDK
- **S3 Request Presigner** - Secure file uploads

### Email

- **AWS SES** - Transactional email service

### Forms & Validation

- **React Hook Form** - Performant forms
- **Hookform Resolvers** - Zod integration for forms

### Documentation

- **Fumadocs** - MDX-based documentation system

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## 📦 Package Structure

```
packages/
├── auth/          # Authentication logic (Better Auth)
├── drizzle/       # Database schema and connection
├── email/         # Email templates and logic
├── hooks/         # Shared React hooks
├── storage/       # File storage (S3) logic
├── trpc/          # tRPC routers and client
└── ui/            # Shared UI components (shadcn/ui)

apps/
├── web/           # Main web application
└── admin/         # Admin dashboard
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10.4.1
- PostgreSQL database (Neon, Supabase, or self-hosted)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables (see Environment Variables section)
cp .env.example .env

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

## 🔧 Adding Components

To add shadcn/ui components to your app, run:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the UI components in the `packages/ui/src/components` directory.

## 🎨 Using Components

Import components from the `ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
```

## ⚙️ Environment Variables

### Important: Environment Variable Management

⚠️ **When you add or change environment variables, you MUST update them in multiple places:**

1. **Root `.env` file** - Your local environment variables
2. **All apps** - If used by multiple apps (web, admin), add to each app's environment
3. **Drizzle package** - If it's `DATABASE_URL`, also update in `packages/drizzle/.env` (if using separate config)
4. **turbo.json** - Add the variable to the `env` array in the `build` task so Turbo passes it during builds

### Example: Adding a New Environment Variable

Let's say you want to add `NEW_API_KEY`:

1. **Add to `.env` file:**

   ```bash
   NEW_API_KEY="your-key-here"
   ```

2. **Add to `turbo.json` build task:**

   ```json
   {
     "tasks": {
       "build": {
         "env": [
           "DATABASE_URL",
           "NEW_API_KEY" // ← Add here
           // ... other vars
         ]
       }
     }
   }
   ```

3. **If it's `DATABASE_URL`, also update:**
   - `packages/drizzle/.env` (if you have one)
   - `packages/drizzle/drizzle.config.ts` (if using dotenv there)

4. **For production (Vercel, etc.):**
   - Add the variable in your hosting platform's environment variable settings

### Required Environment Variables

See `apps/web/app/setup/SETUP_DOCUMENTATION.md` for the complete list of required and optional environment variables.

Minimum required:

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Your app URL (e.g., `http://localhost:3000`)

## 📚 Available Scripts

### Root Level

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages

# Database
pnpm db:generate  # Generate database migrations
pnpm db:push      # Push schema changes to database
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

### Per App

```bash
cd apps/web
pnpm dev          # Start web app on port 3000
pnpm build        # Build web app
pnpm start        # Start production server
```

## 📖 Documentation

- **Setup Guide**: `apps/web/app/setup/SETUP_DOCUMENTATION.md`
- **API Documentation**: `apps/web/app/api/API_DOCUMENTATION.mdx`
- **Email Documentation**: `packages/email/emails/EMAIL_DOCUMENTATION.mdx`

## 🏗️ Project Structure

```
.
├── apps/
│   ├── web/              # Main web application
│   └── admin/            # Admin dashboard
├── packages/
│   ├── auth/             # Authentication
│   ├── drizzle/          # Database schema & connection
│   ├── email/            # Email templates
│   ├── hooks/            # Shared React hooks
│   ├── storage/          # File storage logic
│   ├── trpc/             # tRPC setup
│   └── ui/               # UI components
├── turbo.json            # Turborepo configuration
└── pnpm-workspace.yaml   # pnpm workspace config
```

## 🔐 Security

- Never commit `.env` files
- Use strong, randomly generated secrets
- Rotate API keys regularly
- Use different keys for development/staging/production

## 📝 License

Private template - see license file for details.

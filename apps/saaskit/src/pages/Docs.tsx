import { MONO } from '../lib/constants'
import { PageLayout } from '../components/PageLayout'
import { Bullets, CodeBlock, InlineCode, P, PageHeader, Section } from '../components/content'

const TOC = [
  ['introduction', 'Introduction'],
  ['quickstart', 'Quickstart'],
  ['structure', 'Project structure'],
  ['env', 'Environment variables'],
  ['auth', 'Authentication'],
  ['payments', 'Payments & billing'],
  ['database', 'Database'],
  ['deploy', 'Deployment'],
] as const

const G = '#52525B'
const W = '#FAFAFA'
const S = '#D4D4D8'

function EnvRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid #F4F4F5' }}>
      <code style={{ fontFamily: MONO, fontSize: 13, color: '#0A0A0A', flex: 'none', width: 'min(100%, 230px)' }}>{name}</code>
      <span style={{ color: '#71717A', fontSize: 14.5, lineHeight: 1.5, flex: 1, minWidth: 200 }}>{desc}</span>
    </div>
  )
}

export default function Docs() {
  return (
    <PageLayout maxWidth={1080}>
      <PageHeader
        eyebrow="DOCS"
        title="Get from clone to live."
        lede="Everything you need to configure, extend and ship SaaSKit. Comfortable with React and TypeScript? You're the target reader."
      />

      <div style={{ display: 'flex', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'flex-start' }}>
        {/* TOC */}
        <nav
          style={{
            position: 'sticky',
            top: 96,
            flex: 'none',
            width: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderLeft: '1px solid #E4E4E7',
            paddingLeft: 18,
          }}
          className="docs-toc"
        >
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: '#A1A1AA', marginBottom: 10 }}>
            ON THIS PAGE
          </div>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="lnk-dark" style={{ color: '#71717A', textDecoration: 'none', fontSize: 14, padding: '5px 0', transition: 'color 0.2s' }}>
              {label}
            </a>
          ))}
        </nav>

        {/* content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Section id="introduction" title="Introduction">
            <P>
              SaaSKit ships two starting points — a single-app <strong>Full-Stack</strong> template and a{' '}
              <strong>Monorepo</strong> (Turborepo) workspace. Same stack, same integrations, different shape.
              Auth, payments, billing and the database are already wired together and tested.
            </P>
            <P>
              The stack: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM on Neon Postgres,
              Better Auth, Polar, and React Query. No exotic dependencies — everything is documented and replaceable.
            </P>
          </Section>

          <Section id="quickstart" title="Quickstart">
            <P>Scaffold the template, add your keys, and run it. Three commands:</P>
            <CodeBlock title="terminal">
{'$ '}<span style={{ color: W }}>npx create-saaskit-app@latest</span>{'\n'}
{'$ '}<span style={{ color: W }}>cp .env.example .env.local</span>{'   '}<span style={{ color: G }}># add your keys</span>{'\n'}
{'$ '}<span style={{ color: W }}>npm run dev</span>{'\n'}
<span style={{ color: G }}>  ready on http://localhost:3000</span>
            </CodeBlock>
            <P>
              The generator asks which template you want and writes a typed <InlineCode>.env</InlineCode> contract
              so missing keys fail loudly, not silently.
            </P>
          </Section>

          <Section id="structure" title="Project structure">
            <P>The full-stack template keeps everything in one app with an obvious home for each concern:</P>
            <CodeBlock title="full-stack">
{'app/\n'}
{'├─ (marketing)/   '}<span style={{ color: G }}>landing · pricing</span>{'\n'}
{'├─ (app)/         '}<span style={{ color: G }}>dashboard · settings · billing</span>{'\n'}
{'└─ api/           '}<span style={{ color: G }}>auth · webhooks</span>{'\n'}
{'lib/              '}<span style={{ color: G }}>auth.ts · polar.ts · db/</span>
            </CodeBlock>
            <P>
              The monorepo splits the same code into <InlineCode>apps/</InlineCode> (web, mobile, api) and shared{' '}
              <InlineCode>packages/</InlineCode> (ui, db, auth, config).
            </P>
          </Section>

          <Section id="env" title="Environment variables">
            <P>Every integration is configured through env. Copy the example file and fill in these keys:</P>
            <div style={{ margin: '0 0 20px', borderTop: '1px solid #E4E4E7' }}>
              <EnvRow name="DATABASE_URL" desc="Neon Postgres connection string." />
              <EnvRow name="BETTER_AUTH_SECRET" desc="Random 32+ char secret for session signing." />
              <EnvRow name="GITHUB_CLIENT_ID / _SECRET" desc="OAuth credentials for GitHub sign-in." />
              <EnvRow name="POLAR_ACCESS_TOKEN" desc="Polar API token for checkout and the customer portal." />
              <EnvRow name="POLAR_WEBHOOK_SECRET" desc="Verifies incoming Polar webhook signatures." />
            </div>
          </Section>

          <Section id="auth" title="Authentication">
            <P>
              Better Auth handles email, OAuth and sessions. Every route under <InlineCode>(app)/</InlineCode> is
              protected by default — drop in a layout guard and you're done:
            </P>
            <CodeBlock title="app/(app)/layout.tsx">
<span style={{ color: G }}>{'// every route in (app)/ is protected by default'}</span>{'\n'}
<span style={{ color: W }}>const</span>{' session = '}<span style={{ color: W }}>await</span>{' auth.api.getSession({\n'}
{'  headers: '}<span style={{ color: W }}>await</span>{' headers(),\n'}
{'});\n'}
<span style={{ color: W }}>if</span>{' (!session) redirect('}<span style={{ color: S }}>"/sign-in"</span>{');'}
            </CodeBlock>
          </Section>

          <Section id="payments" title="Payments & billing">
            <P>
              Polar checkout and webhooks are pre-tested end to end. A subscription event lands, your database
              updates, your UI reflects it — no glue to write:
            </P>
            <CodeBlock title="app/api/webhooks/polar/route.ts">
<span style={{ color: W }}>export const</span>{' POST = Webhooks({\n'}
{'  onSubscriptionActive: '}<span style={{ color: W }}>async</span>{' ({ data }) => {\n'}
{'    '}<span style={{ color: W }}>await</span>{' db.update(users)\n'}
{'      .set({ plan: '}<span style={{ color: S }}>"pro"</span>{' })\n'}
{'      .where(eq(users.id, data.customer.externalId));\n'}
{'  },\n'}
{'});'}
            </CodeBlock>
            <P>
              Buyers manage their plan and connect benefits through the Polar customer portal, reachable from the
              dashboard.
            </P>
          </Section>

          <Section id="database" title="Database">
            <P>
              A type-safe Drizzle schema on Neon Postgres. Edit <InlineCode>schema.ts</InlineCode>, push, and the
              types flow end to end — no migration files to hand-write for everyday changes.
            </P>
            <CodeBlock title="lib/db/schema.ts">
<span style={{ color: W }}>export const</span>{' users = pgTable('}<span style={{ color: S }}>"users"</span>{', {\n'}
{'  id: text('}<span style={{ color: S }}>"id"</span>{').primaryKey(),\n'}
{'  email: text('}<span style={{ color: S }}>"email"</span>{').notNull().unique(),\n'}
{'  plan: text('}<span style={{ color: S }}>"plan"</span>{').$type<'}<span style={{ color: S }}>"free" | "pro"</span>{'>(),\n'}
{'});'}
            </CodeBlock>
          </Section>

          <Section id="deploy" title="Deployment">
            <P>Ship to Vercel in minutes. Env validation tells you what's missing before the build runs.</P>
            <Bullets
              items={[
                <>Push the repo and import it into Vercel.</>,
                <>Add the env keys from <InlineCode>.env.example</InlineCode> to the project.</>,
                <>Point the Polar webhook at <InlineCode>/api/webhooks/polar</InlineCode>.</>,
                <>Deploy — the database schema pushes on first boot.</>,
              ]}
              mark="✓"
            />
          </Section>
        </div>
      </div>
    </PageLayout>
  )
}

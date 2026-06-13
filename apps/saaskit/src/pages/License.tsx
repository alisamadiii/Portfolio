import { PageLayout } from '../components/PageLayout'
import { Bullets, Divider, P, PageHeader, Section } from '../components/content'

export default function License() {
  return (
    <PageLayout>
      <PageHeader
        eyebrow="LICENSE"
        title="The license, in plain words."
        lede="Buy once, build forever. A per-developer license that covers unlimited products — you just can't resell the template itself."
      />
      <Divider />

      <Section title="Summary">
        <P>
          When you purchase SaaSKit you get a perpetual, non-exclusive license to use the source code to build
          and ship your own products. The Full-Stack and Monorepo licenses are per developer; the Bundle / Team
          license covers up to 10 developers in one organization.
        </P>
      </Section>

      <Section title="What you can do">
        <Bullets
          mark="✓"
          items={[
            'Build unlimited personal and commercial products on top of the template.',
            'Use it for unlimited client projects and hand the finished product to the client.',
            'Modify the source however you like — it’s yours to extend.',
            'Receive lifetime updates to the private repository.',
          ]}
        />
      </Section>

      <Section title="What you can't do">
        <Bullets
          mark="✗"
          items={[
            'Resell, redistribute or republish the template source as a competing starter, boilerplate or kit.',
            'Share your repository access or license seat with developers outside your license tier.',
            'Remove the license notice from the source you redistribute inside a delivered product.',
          ]}
        />
      </Section>

      <Section title="Per-developer & team seats">
        <P>
          A single license is tied to one developer. If your team needs access for several people, the Bundle /
          Team license grants up to 10 seats within one company. Need more seats? Reach out and we'll sort it.
        </P>
      </Section>

      <Section title="Updates & access">
        <P>
          Every purchase includes lifetime access to the private repo. When the stack moves — a Next.js major, a
          Better Auth release, a Polar API change — the template is updated and you pull the changes. Access is
          granted through your Polar customer portal once you connect GitHub.
        </P>
      </Section>

      <Section title="Refunds">
        <P>
          Because you receive the full source immediately, purchases are generally non-refundable. If something is
          genuinely broken and we can't make it right, email us within 14 days and we'll make it fair.
        </P>
      </Section>

      <P style={{ marginTop: 8, color: '#71717A', fontSize: 14.5 }}>
        Questions about the license? Email <strong>license@saaskit.app</strong>.
      </P>
    </PageLayout>
  )
}

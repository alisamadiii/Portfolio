import { Link } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { Divider, P, PageHeader, Section } from '../components/content'

export default function Terms() {
  return (
    <PageLayout>
      <PageHeader
        eyebrow="TERMS"
        title="Terms of service."
        lede="The agreement between you and SaaSKit when you buy and use the templates. Last updated June 2026."
      />
      <Divider />

      <Section title="1. Acceptance">
        <P>
          By purchasing or using SaaSKit you agree to these terms. If you're buying on behalf of a company, you
          confirm you have authority to bind that company to this agreement.
        </P>
      </Section>

      <Section title="2. License">
        <P>
          Your use of the source code is governed by the{' '}
          <Link to="/license" style={{ color: '#0A0A0A', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            SaaSKit License
          </Link>
          , which forms part of these terms. In short: build anything, don't resell the template itself.
        </P>
      </Section>

      <Section title="3. Payments">
        <P>
          Purchases are one-time payments processed by Polar, our merchant of record. Applicable taxes are
          calculated at checkout. You're responsible for keeping your billing details accurate in the Polar
          customer portal.
        </P>
      </Section>

      <Section title="4. Refunds">
        <P>
          Because you receive the complete source on purchase, payments are generally non-refundable. We review
          good-faith refund requests made within 14 days where the product is genuinely defective.
        </P>
      </Section>

      <Section title="5. Acceptable use">
        <P>
          You may not use SaaSKit to build or distribute anything unlawful, or to republish the template source as
          a competing product. You're responsible for the products you ship and the data your users entrust to them.
        </P>
      </Section>

      <Section title="6. Intellectual property">
        <P>
          SaaSKit and its source remain the intellectual property of its authors. Your license grants usage
          rights, not ownership of the underlying template. Products you build on it belong to you.
        </P>
      </Section>

      <Section title="7. Warranty disclaimer">
        <P>
          The templates are provided “as is,” without warranty of any kind. We don't guarantee they're free of
          bugs or fit for a particular purpose — you're responsible for testing before you ship to production.
        </P>
      </Section>

      <Section title="8. Limitation of liability">
        <P>
          To the maximum extent permitted by law, our total liability for any claim relating to SaaSKit is limited
          to the amount you paid for it. We're not liable for indirect or consequential damages.
        </P>
      </Section>

      <Section title="9. Changes to these terms">
        <P>
          We may update these terms as the product evolves. Material changes will be reflected here with a new
          “last updated” date. Continued use after a change means you accept the revised terms.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          Questions about these terms? Email <strong>support@saaskit.app</strong> and we'll get back to you.
        </P>
      </Section>
    </PageLayout>
  )
}

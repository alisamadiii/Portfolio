import { siteConfig } from "@/lib/site-config";

// Organization + WebSite graph. WebSite.name is what Google reads for the
// SERP site-name (instead of showing the bare domain).
const { url, name, description, business } = siteConfig;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": business.type,
      "@id": `${url}/#organization`,
      name,
      url,
      logo: {
        "@type": "ImageObject",
        url: `${url}/icon-512.png`,
        width: 512,
        height: 512,
      },
      description,
      ...(business.email ? { email: business.email } : {}),
      ...(business.telephone ? { telephone: business.telephone } : {}),
      ...(business.address.locality
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: business.address.locality,
              addressRegion: business.address.region,
              addressCountry: business.address.country,
            },
          }
        : {}),
      ...(business.sameAs.length > 0 ? { sameAs: business.sameAs } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${url}/#website`,
      url,
      name,
      description,
      publisher: { "@id": `${url}/#organization` },
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

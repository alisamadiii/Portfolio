const SITE_URL = "https://motion.alisamadii.com";

// WebSite.name is what Google reads for the SERP site-name
// (instead of showing the bare domain).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Ali Samadi",
      url: "https://www.alisamadii.com",
      sameAs: [
        "https://x.com/alisamadii_",
        "https://github.com/alisamadiii",
        "https://www.linkedin.com/in/alireza17/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Motion",
      alternateName: "Motion by Ali Samadi",
      description:
        "A collection of polished React components with animations, key points, and video demos to enhance your projects.",
      publisher: { "@id": `${SITE_URL}/#person` },
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

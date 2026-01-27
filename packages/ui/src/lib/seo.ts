import { Metadata } from "next";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function generateMetadata({
  title,
  description = "A modern, full-stack SaaS template with authentication, payments, admin dashboard, and more.",
  image = "/og-image.jpg",
  url,
}: SEOProps = {}): Metadata {
  const baseUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || "http://localhost:3000";
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImageUrl = image.startsWith("http") ? image : `${baseUrl}${image}`;

  return {
    title: title ? `${title} | Template` : "Template - Modern SaaS Platform",
    description,
    openGraph: {
      title: title ? `${title} | Template` : "Template - Modern SaaS Platform",
      description,
      type: "website",
      url: fullUrl,
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title || "Template - Modern SaaS Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | Template` : "Template - Modern SaaS Platform",
      description,
      images: [fullImageUrl],
    },
  };
}

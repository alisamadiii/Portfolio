import { Metadata } from "next";
import { allPosts } from "content-collections";

import { SITE_NAME, SITE_URL } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return allPosts.map((post) => ({ slug: post._meta.path }));
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const post = allPosts.find((p) => p._meta.path === slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      url: `/blog/${slug}`,
      ...(post.thumbnail && { images: [{ url: post.thumbnail }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.thumbnail && { images: [post.thumbnail] }),
    },
  };
}

export default async function BlogPostLayout({ children, params }: Props) {
  const { slug } = await params;
  const post = allPosts.find((p) => p._meta.path === slug);

  const jsonLd = post && {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.date).toISOString(),
    ...(post.thumbnail && { image: post.thumbnail }),
    author: { "@id": `${SITE_URL}/#person` },
    publisher: { "@id": `${SITE_URL}/#person` },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

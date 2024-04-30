import React from "react";
import { notFound } from "next/navigation";

import { allServices } from "@/.contentlayer/generated";
import { type Metadata } from "next";
import Links from "./Links";
import { Mdx } from "@/components/MDXContent";

interface Props {
  params: {
    slug: string;
  };
}

interface generateMetadataProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: generateMetadataProps): Promise<Metadata> {
  // read route params
  const slug = params.slug;

  const findingServices = allServices.find(
    (service) => slug === service.slugAsParams
  );

  if (!findingServices) {
    return {};
  }

  return {
    title: {
      default: findingServices.title,
      absolute: `${findingServices.title} | Blog`,
    },
    openGraph: {
      title: findingServices.title,
      description: "will be adding",
      url: "https://www.alirezasamadi.com/",
      images: [
        {
          url: findingServices.image,
          width: 800,
          height: 600,
        },
      ],
    },
  };
}
export default function BlogPage({ params }: Props) {
  const findingBlogs = allServices.find(
    (post) => params.slug === post.slugAsParams
  );

  if (!findingBlogs) {
    return notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* <BlogHeader service={findingBlogs} /> */}
      <Mdx code={findingBlogs.body.code} />
      <Links service={findingBlogs} />
    </div>
  );
}

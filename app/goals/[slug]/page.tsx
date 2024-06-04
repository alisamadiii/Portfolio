import React from "react";
import { notFound } from "next/navigation";

import { allGoals } from "@/.contentlayer/generated";
import { type Metadata } from "next";
import { Mdx } from "@/components/MDXContent";
import ContentWrapper from "@/components/content-wrapper";
import Hr from "@/components/hr";
import Badge from "@/components/badge";

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

  const findingGoal = allGoals.find((post) => slug === post.slugAsParams);

  if (!findingGoal) {
    return {};
  }

  return {
    title: {
      default: findingGoal.title,
      absolute: `${findingGoal.title} | Blog`,
    },
    openGraph: {
      title: findingGoal.title,
      description: findingGoal.description,
      url: "https://www.alirezasamadi.com/",
      //   images: [
      //     {
      //       url: findingGoal.blogImage,
      //       width: 800,
      //       height: 600,
      //     },
      //   ],
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const findingGoal = allGoals.find(
    (post) => params.slug === post.slugAsParams
  );

  if (!findingGoal) {
    return notFound();
  }

  return (
    <ContentWrapper>
      <header>
        <h1 className="text-4xl font-bold tracking-tight">
          {findingGoal.title}
        </h1>
        <p className="mb-1 mt-2 text-base leading-7 text-muted-3">
          {findingGoal.description}
        </p>

        <ul className="space-x-1">
          {findingGoal.keyboard?.map((key) => <Badge key={key}>{key}</Badge>)}
        </ul>
      </header>

      <Hr />

      <Mdx code={findingGoal.body.code} />
    </ContentWrapper>
  );
}

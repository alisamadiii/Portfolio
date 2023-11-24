"use client";

import { type Blog } from "@/.contentlayer/generated";
import Image from "next/image";
import React, { Suspense } from "react";
import Balancer from "react-wrap-balancer";

interface Props {
  blog: Blog;
}

export default function Links({ blog }: Props) {
  const linkRegex = /https?:\/\/[^\s]+/g;
  const links = blog.body.raw.match(linkRegex) ?? [];

  const validLinks = links
    .filter((link) => {
      const invalidExtensionsRegex =
        /\.(jpg|jpeg|png|avif|gif|bmp|mp4|avi|mkv|mov|wmv)(?=['"]?$)/i;

      if (invalidExtensionsRegex.test(link)) {
        return false; // Exclude image and video links
      }

      return true; // Include other links
    })
    .map((link) => link.replaceAll(")", ""));

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <div>
      <Balancer className="mb-6 mt-8 text-2xl font-bold">
        Access All the Links Here:
      </Balancer>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="flex flex-col gap-4">
          {validLinks.map((link, index) => (
            <LinkMetadata key={index} link={link} />
          ))}
        </div>
      </Suspense>
    </div>
  );
}

async function LinkMetadata({ link }: { link: string }) {
  try {
    const generateMetadata = await fetch("/api/generateMetadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(link),
    });

    const data = await generateMetadata.json();

    return (
      <a
        href={link}
        target="_blank"
        className="flex flex-col items-center gap-3 overflow-hidden rounded-lg border border-border duration-100 hover:bg-box md:flex-row"
        rel="noreferrer"
      >
        {data.ogImage && (
          <Image
            src={data.ogImage[0].url}
            width={600}
            height={300}
            alt=""
            className="w-full md:w-48"
          />
        )}
        <p className="flex flex-col max-md:px-3 max-md:pb-3">
          <p className="line-clamp-1">{data.ogTitle}</p>
          <small className="line-clamp-2 text-xs text-muted">
            {data.ogDescription}
          </small>
          <p className="mt-2 flex items-center gap-1">
            {data.favicon && data.favicon !== "/favicon.ico" && (
              <Image src={data.favicon} width={15} height={15} alt="" />
            )}
            {data.ogSiteName && (
              <small className="text-muted">{data.ogSiteName}</small>
            )}
          </p>
        </p>
      </a>
    );
  } catch (e) {
    console.log(e);
  }
}

import Head from "next/head";
import React from "react";

type Props = {
  title: string;
  description: string;
};

export default function Meta_Tag({ title, description }: Props) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:url" content="https://www.alirezasamadi.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta
        property="og:image"
        content="https://i.ibb.co/9hyw1rL/Meta-Tag.png"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="alirezasamadi.com" />
      <meta property="twitter:url" content="https://www.alirezasamadi.com/" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta
        name="twitter:image"
        content="https://i.ibb.co/9hyw1rL/Meta-Tag.png"
      />
      <link rel="shortcut icon" href="logo.jpg" type="image/x-icon" />
    </Head>
  );
}

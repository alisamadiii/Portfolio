import React from "react";
import Head from "next/head";

type Props = {
  title: string;
};

export default function HeadTag({ title }: Props) {
  return (
    <Head>
      <title>{title}</title>
      <meta
        name="description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <link rel="shortcut icon" href="/My Image.png" type="image/x-icon" />

      <meta property="og:url" content="https://www.alirezasamadi.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Ali Reza" />
      <meta
        property="og:description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <meta
        property="og:image"
        content="https://i.ibb.co/7W6wnCR/Meta-Tag.png"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="alirezasamadi.com" />
      <meta property="twitter:url" content="https://www.alirezasamadi.com/" />
      <meta name="twitter:title" content="Ali Reza" />
      <meta
        name="twitter:description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <meta
        name="twitter:image"
        content="https://i.ibb.co/7W6wnCR/Meta-Tag.png"
      />
    </Head>
  );
}

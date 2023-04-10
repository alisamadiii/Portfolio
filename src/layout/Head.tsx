import Head from "next/head";
import React from "react";

type Props = {};

export default function Meta_Tag({}: Props) {
  return (
    <Head>
      <title>Ali Reza | Portfolio</title>
      <meta
        name="description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />

      <meta property="og:url" content="https://www.alirezasamadi.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Ali Reza | Portfolio" />
      <meta
        property="og:description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <meta
        property="og:image"
        content="https://i.ibb.co/9hyw1rL/Meta-Tag.png"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="alirezasamadi.com" />
      <meta property="twitter:url" content="https://www.alirezasamadi.com/" />
      <meta name="twitter:title" content="Ali Reza | Portfolio" />
      <meta
        name="twitter:description"
        content="As a front-end developer, I specialize in building and maintaining the user interface of web applications."
      />
      <meta
        name="twitter:image"
        content="https://i.ibb.co/9hyw1rL/Meta-Tag.png"
      />
    </Head>
  );
}

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="h-full">
      <Head />
      <body className="relative min-h-full pb-24 bg-light-blue text-dark-blue">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

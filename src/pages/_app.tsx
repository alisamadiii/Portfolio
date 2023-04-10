import "@/styles/globals.css";
import "@/styles/CodeBlocks.css";
import type { AppProps } from "next/app";

import Router from "next/router";
import ProgressBar from "@badrap/bar-of-progress";

import Layout from "@/layout";
import Intro from "@/components/Intro";

const progress = new ProgressBar({
  size: 2,
  color: "#FF9C45",
  className: "bar-of-progress",
  delay: 100,
});

Router.events.on("routeChangeStart", () => progress.start());
Router.events.on("routeChangeComplete", () => progress.finish());
Router.events.on("routeChangeError", () => progress.finish());

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      {/* <Intro /> */}
      <Component {...pageProps} />
    </Layout>
  );
}

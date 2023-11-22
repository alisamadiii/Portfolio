import React from "react";
import { Metadata } from "next";
import ServiceLinks from "./ServiceLinks";
import Badge from "../components/badge";
import ClientBadge from "./client-badge";

type Props = {};

export const metadata: Metadata = {
  title: "Service",
};

export default function Blog({}: Props) {
  return (
    <>
      <h1 className="text-2xl font-bold">hire me!</h1>
      <ClientBadge />
      <p className="mb-8 text-base text-muted">
        Welcome to our Website Building Service, where your online aspirations
        become reality. As a skilled developer, I specialize in creating
        stunning, functional, and fully customized websites that align perfectly
        with your unique needs and goals. From concept to completion, I bring
        your vision to life, ensuring seamless navigation, compelling design,
        and optimal user experience. Let&apos;s collaborate and build a
        captivating online presence that sets you apart from the competition.
      </p>
      <ServiceLinks />
    </>
  );
}

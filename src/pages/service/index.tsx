import { Heading2 } from "@/components";
import Container from "@/layout/Container";
import Meta_Tag from "@/layout/Head";
import React from "react";

type Props = {};

export default function index({}: Props) {
  return (
    <>
      <Meta_Tag title="Service" description="" />
      <div className="py-24">
        <Container className="text-center">
          <Heading2 lineUnder={false}>Service</Heading2>
          <p className="w-full max-w-[800px] mx-auto">
            Embark on a streamlined digital journey with our Service Route. As a
            one-person operation, I offer comprehensive solutions for{" "}
            <strong>website building</strong>, <strong>design</strong>, and{" "}
            <strong>engaging promotional tweets</strong>. Experience
            personalized service and unleash the full potential of your online
            presence. Join me on this route to success in the digital realm.
          </p>
        </Container>
      </div>
    </>
  );
}

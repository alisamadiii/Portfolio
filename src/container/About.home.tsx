import React from "react";
import Image from "next/image";

import { Heading2 } from "@/components";
import Container from "@/layout/Container";

import MyImage from "@/assets/my image.png";

type Props = {};

export default function About({}: Props) {
  return (
    <Container className="space-y-12">
      <Heading2>About</Heading2>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">
            As a front-end developer, I specialize in building and maintaining
            the user interface of web applications.
          </h3>
          <p className="font-medium">
            Hi, my name is Ali Reza and I am a web developer with over 2 years
            of experience in the field. I specialize in front-end development
            and have a strong background in ReactJS. I am always looking to
            learn and grow as a developer, and I am excited to work on new and
            challenging projects
          </p>
        </div>
        <div>
          <Image
            src={MyImage}
            width={500}
            height={500}
            alt="my image"
            className="mx-auto"
          />
        </div>
      </div>
    </Container>
  );
}

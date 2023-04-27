import Container from "@/layout/Container";
import React from "react";

type Props = {};

// Images
import Introduction_IMG from "../../assets/Introduction - AnimatedContent.png";
import Image from "next/image";
import Link from "next/link";

export default function TwitterActivity({}: Props) {
  return (
    <>
      <Container className="mt-24">
        <header className="grid items-center lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">
              Animated Content
            </h1>
            <p className="my-4 md:text-lg">
              Animated content is something that everyone loves, and it can make
              lessons easier to learn. If you are trying to increase engagement
              on social media, I would recommend creating animated content.
            </p>
            <Link
              href={"/twitter-activity/works"}
              className="inline-block p-[2px] overflow-hidden rounded-md bg-gradient-to-br from-primary to-secondary group"
            >
              <div className="px-4 py-2 font-medium duration-200 rounded-md bg-light-blue group-hover:bg-transparent group-hover:text-white">
                Check all the Contents
              </div>
            </Link>
          </div>
          <Image src={Introduction_IMG} width={1000} height={600} alt="" />
        </header>
      </Container>

      <section className="bg-[#e6edfa] py-12">
        <Container>
          <h2 className="mb-4 text-3xl font-black md:text-4xl">
            Why should I create animated content?
          </h2>
          <p className="md:text-lg">
            Animated content is something that everyone loves, and it can make
            lessons easier to learn. If you are trying to increase engagement on
            social media, I would recommend creating animated content.
          </p>
        </Container>
      </section>
    </>
  );
}

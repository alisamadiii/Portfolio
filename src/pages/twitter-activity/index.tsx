import Container from "@/layout/Container";
import React from "react";
import Image from "next/image";
import Link from "next/link";

import Meta_Tag from "@/layout/Head";

type Props = {};

// Images
import Introduction_IMG from "../../assets/Introduction - AnimatedContent.png";
import TwitterInformation_IMG from "../../assets/twitter-information.png";

import Each_Testimonial from "@/components/Each_Testimonial";
import { ANILEARN_TESTIMONIAL } from "@/contents/Anilearn_Testimonial";

export default function TwitterActivity({}: Props) {
  return (
    <>
      <Meta_Tag
        title="Twitter Activity"
        description="How did I find +14k audience on Twitter in one month?"
      />
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

      <Container className="py-12">
        <h2 className="mb-4 text-3xl font-black md:text-4xl">
          Why did I start making animated contents?
        </h2>
        <p className="md:text-lg">
          I have been creating content since the beginning of this year (2023).
          When I first uploaded my content, I realized that it would not only
          increase my engagement but also be appreciated by others.
        </p>
        <h3 className="mt-4 mb-2 text-2xl font-bold md:text-3xl">
          First Content:
        </h3>
        <p>
          I knew that this was indeed going to change everything and be
          appreciated by most people. I received lots of encouraging comments,
          so I decided to continue creating content.
        </p>
        <a
          href={
            "https://twitter.com/Ali_Developer05/status/1610562316214632448?s=20"
          }
          target="_blank"
          className="inline-block p-[2px] overflow-hidden rounded-md bg-gradient-to-br from-primary to-secondary group mt-4"
        >
          <div className="px-4 py-2 font-medium duration-200 rounded-md bg-light-blue group-hover:bg-transparent group-hover:text-white">
            Check my first Content
          </div>
        </a>
      </Container>

      <Container className="flex flex-wrap gap-8 py-12">
        <div className="basis-[300px] grow">
          <h2 className="mb-4 text-3xl font-black md:text-4xl">
            How did I find +14k audience on Twitter in one month?
          </h2>
          <p className="md:text-lg">
            I kept sharing content for a month, and my followers increased from
            2k to 10k in that time.
          </p>
        </div>
        <Image
          className="shadow-sm rounded-xl basis-[300px] grow"
          src={TwitterInformation_IMG}
          width={1000}
          height={1000}
          alt=""
        />
      </Container>

      <Container>
        <div className="w-full max-w-[1000px] mx-auto bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center">
          <h2 className="text-xl font-bold md:text-2xl">
            Do you want to learn how I am making animated Content?
          </h2>
          <p>You can get a free course which will teach you</p>
          <a
            href="https://alireza05.gumroad.com/l/how-to-make-animated-content"
            target="_blank"
            className="px-4 py-1 mt-2 duration-200 border rounded-md hover:bg-white hover:text-black"
          >
            Get Now
          </a>
        </div>
      </Container>

      <Container className="relative py-12 mt-24">
        <h2 className="mb-4 text-3xl font-black md:text-3xl">
          What people are saying ❤️
        </h2>
        <div className="relative grid grid-flow-col auto-cols-[300px] md:auto-cols-[400px] items-start gap-4 overflow-x-auto snap-x snap-mandatory">
          {ANILEARN_TESTIMONIAL.map((testimonial) => (
            <Each_Testimonial key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
        <div className="absolute top-0 right-0 w-1/6 h-full bg-gradient-to-r from-transparent to-light-blue" />
      </Container>
    </>
  );
}

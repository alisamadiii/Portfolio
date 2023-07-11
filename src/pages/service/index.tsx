import { Heading2 } from "@/components";
import Container from "@/layout/Container";
import Meta_Tag from "@/layout/Head";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {};

import Building_Website_IMG from "../../assets/building website.png";
import { AiOutlineTwitter } from "react-icons/ai";
import { TfiVideoClapper } from "react-icons/tfi";

export default function index({}: Props) {
  return (
    <>
      <Meta_Tag title="Service" description="" />
      <div className="py-24">
        <Container>
          <Heading2 lineUnder={false} className="w-full text-center">
            Service
          </Heading2>
          <p className="w-full max-w-[800px] mx-auto text-center">
            Embark on a streamlined digital journey with our Service Route. As a
            one-person operation, I offer comprehensive solutions for{" "}
            <strong>website building</strong>, <strong>design</strong>, and{" "}
            <strong>engaging promotional tweets</strong>. Experience
            personalized service and unleash the full potential of your online
            presence. Join me on this route to success in the digital realm.
          </p>
          <section className="grid gap-5 mt-16 md:grid-cols-2">
            <div className="relative p-4 pb-24 overflow-hidden duration-200 bg-white border-2 border-white isolate shadow-container rounded-xl hover:-translate-y-2 before:absolute before:inset-0 before:bg-grainy-gradient before:bg-cover before:bg-center before:opacity-0 before:-z-10 hover:before:opacity-40 before:duration-200">
              <h2 className="text-3xl font-bold">Building Website</h2>
              <p className="my-3">
                Transform your online vision into reality with our "Building
                Website" service. From start to finish, I'll create a stunning
                and functional website that reflects your unique needs and
                captivates your audience. Let's bring your online presence to
                life.
              </p>
              <Link href={"/service/building-website"} className="opacity-70">
                Read more
              </Link>
              <Image
                src={Building_Website_IMG}
                width={200}
                height={200}
                alt="building website"
                className="absolute bottom-0 right-0 translate-x-5 translate-y-5"
              />
            </div>
            <div className="relative p-4 pb-24 overflow-hidden duration-200 bg-white border-2 border-white isolate shadow-container rounded-xl hover:-translate-y-2 before:absolute before:inset-0 before:bg-grainy-gradient before:bg-cover before:bg-center before:opacity-0 before:-z-10 hover:before:opacity-40 before:duration-200">
              <h2 className="text-3xl font-bold">Promotional Tweet</h2>
              <p className="my-3">
                Leverage my +25k Twitter following with our "Promotional Tweet"
                service. Engage a wide audience and amplify your brand, product,
                or service through targeted and captivating tweets. Let's
                harness the power of social media to drive your business
                forward.
              </p>
              <Link
                href={"https://sponsor.alirezasamadi.com/"}
                target="_blank"
                className="opacity-70"
              >
                Read more
              </Link>
              <AiOutlineTwitter className="absolute bottom-0 right-0 translate-y-8 text-9xl text-twitter" />
            </div>
            <div className="relative p-4 pb-24 overflow-hidden duration-200 bg-white border-2 border-white isolate shadow-container rounded-xl hover:-translate-y-2 before:absolute before:inset-0 before:bg-grainy-gradient before:bg-cover before:bg-center before:opacity-0 before:-z-10 hover:before:opacity-40 before:duration-200">
              <h2 className="text-3xl font-bold">Video Showcase</h2>
              <p className="my-3">
                Leverage my +25k Twitter following with our "Promotional Tweet"
                service. Engage a wide audience and amplify your brand, product,
                or service through targeted and captivating tweets. Let's
                harness the power of social media to drive your business
                forward.
              </p>
              <Link href={"/service/video-showcase"} className="opacity-70">
                Read more
              </Link>
              <TfiVideoClapper className="absolute bottom-0 translate-y-3 rotate-12 right-4 text-9xl text-twitter" />
            </div>
          </section>
        </Container>
      </div>
    </>
  );
}

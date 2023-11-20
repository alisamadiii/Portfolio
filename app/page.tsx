import Image from "next/image";
import TechnologyIcon from "./assets/technology.icon";
import { MotionH1 } from "./framer";
import { CalendarDays } from "lucide-react";

// import ParagraphAnimate from "./components/ParagraphAnimate";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/app/components/hover-card";

const technologies: Technology[] = ["nextjs", "supabase", "tailwind"];

export default function Home() {
  return (
    <>
      <div className="mb-8 overflow-hidden">
        <MotionH1 className="text-2xl font-bold">
          hey, I&apos; m Ali Reza 👋
        </MotionH1>
      </div>
      <p className="mb-5 leading-6 text-muted">
        I&apos;m Ali Reza! I&apos;ve got 2+ years of web dev experience, mainly
        focusing on front-end magic with ReactJS. I&apos;m all about embracing
        new challenges and learning opportunities. Let&apos;s build something
        awesome together!
      </p>
      {/* <ParagraphAnimate>
        I&apos;m Ali Reza! I&apos;ve got 2+ years of web dev experience, mainly
        focusing on front-end magic with ReactJS. I&apos;m all about embracing
        new challenges and learning opportunities. Let&apos;s build something
        awesome together!
      </ParagraphAnimate> */}
      <p className="leading-6 text-muted">
        I began creating animated content in January 2023, and within one month,
        I gained 10k followers. My content has been well-received by many
        people, and I continue to improve it every day. You can watch some of my
        favourites below.
      </p>
      <HoverCard>
        <HoverCardTrigger className="my-8">
          <a
            href="https://twitter.com/alirdev"
            target="_blank"
            className="flex w-full items-center gap-4 rounded border border-border bg-box px-3 py-4 outline-none duration-200 focus:shadow-box-focus"
          >
            <div>
              <Image
                src={"/my-image.png"}
                width={120}
                height={120}
                alt="my-image"
                className="h-16 w-16"
              />
            </div>
            <div className="grow">
              <p className="font-semibold">@alirdev</p>
              <p className="text-muted-2">33000 followers</p>
            </div>
            <svg
              height="100%"
              viewBox="0 0 15 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-3"
            >
              <path
                d="M12.9282 0.425631L1.68479 1.80615L1.87944 3.39147L10.4083 2.34997L0.461526 15.0812L1.72392 16.0675L11.6707 3.33626L12.7234 11.8637L14.3087 11.6691L12.9282 0.425631Z"
                fill="currentColor"
              />
            </svg>
          </a>
        </HoverCardTrigger>
        <HoverCardContent className="flex w-full max-w-xs items-start justify-between space-x-4">
          <Image
            src={"/my-image.png"}
            width={40}
            height={40}
            alt="twitter image"
          />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@alirdev</h4>
            <p className="text-sm">
              Sharing Animated Content and Tech Tools. Building better and
              faster with Next.js
            </p>
            <div className="flex items-center pt-2">
              <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
              <span className="text-muted-foreground text-xs">
                Joined January 2022
              </span>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
      <p className="mb-5 leading-6 text-muted">Experience with:</p>
      <div className="flex flex-wrap gap-2">
        {technologies.map((tech, index) => (
          <div
            key={index}
            className="rounded border border-border  bg-box px-3 py-4"
          >
            <TechnologyIcon name={tech} />
          </div>
        ))}
      </div>
    </>
  );
}

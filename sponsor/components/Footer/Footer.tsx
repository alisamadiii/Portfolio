import { UserContext } from "@/context/User.context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useContext } from "react";

type Props = {};

export default function Footer({}: Props) {
  const { currentUser } = useContext(UserContext);
  const { asPath } = useRouter();

  return (
    <footer className="sticky top-0 hidden w-full h-full max-w-xs pt-2 md:block">
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
        {currentUser!.tweets.map((tweet) => {
          return tweet.media!.map((image, index) => (
            <Link key={index} href={`/status/${tweet.id}`}>
              <Image
                key={index}
                src={image}
                width={100}
                height={100}
                alt=""
                className={`duration-150 ${
                  asPath.includes("status") &&
                  asPath.includes(tweet.id.toString()) === false &&
                  "opacity-50"
                } hover:opacity-100`}
              />
            </Link>
          ));
        })}
      </div>
    </footer>
  );
}

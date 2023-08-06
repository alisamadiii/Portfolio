import { UserContext } from "@/context/User.context";
import Image from "next/image";
import React, { useContext } from "react";

type Props = {};

export default function Footer({}: Props) {
  const { currentUser } = useContext(UserContext);

  return (
    <footer className="sticky top-0 hidden w-full h-full max-w-xs pt-2 md:block">
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
        {currentUser!.tweets.map((tweet) => {
          return tweet.media!.map((image) => (
            <Image src={image} width={100} height={100} alt="" />
          ));
        })}
      </div>
    </footer>
  );
}

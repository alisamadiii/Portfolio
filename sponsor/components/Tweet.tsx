import Image from "next/image";
import React, { useContext } from "react";

import { UserContext } from "@/context/User.context";
import VerifiedIcon from "@/public/VerifiedIcon";
import { TweetType } from "@/types/User.t";
import { convertTimestampToDateTime } from "@/utils";

type Props = {
  tweet: TweetType;
};

export default function Tweet({ tweet }: Props) {
  const { currentUser } = useContext(UserContext);

  return (
    <div key={tweet.id} className="flex items-start gap-4">
      <Image
        src={currentUser!.display_URL}
        width={40}
        height={40}
        alt=""
        className="translate-y-1 rounded-full"
      />
      <div>
        <div className="flex items-center gap-1">
          <h2 className="font-bold text-base/7">{currentUser?.name}</h2>
          {currentUser?.verified && <VerifiedIcon />}
          <h3 className="text-font-2">{currentUser?.username}</h3>
          <h3 className="text-font-2">·</h3>
          <h3 className="text-font-2">
            {convertTimestampToDateTime(tweet.created_at)}
          </h3>
        </div>
        <p className="leading-4">{tweet.text}</p>
        {/* Media */}
        <div className="flex flex-wrap mt-3">
          {tweet.media !== null &&
            tweet.media.map((m) => (
              <Image
                src={m}
                width={600}
                height={172}
                alt=""
                className="w-full max-w-[389px] rounded-xl border border-black/10"
              />
            ))}
        </div>
      </div>
    </div>
  );
}

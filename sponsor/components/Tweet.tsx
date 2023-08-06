import Image from "next/image";
import React, { useContext } from "react";

import { UserContext } from "../context/User.context";
import VerifiedIcon from "../public/VerifiedIcon";
import { TweetType } from "../types/User.t";
import { convertTimestampToDateTime, formatLargeNumber } from "../utils";

// Icons
import { FaRegComment } from "react-icons/fa";
import { AiOutlineRetweet, AiFillHeart } from "react-icons/ai";
import { BsBarChartFill } from "react-icons/bs";

type Props = {
  tweet: TweetType;
};

export default function Tweet({ tweet }: Props) {
  const { currentUser } = useContext(UserContext);

  return (
    <div className="flex items-start w-full gap-4 px-4 py-3 duration-200 cursor-pointer hover:bg-tweet-hover">
      <Image
        src={currentUser!.display_URL}
        width={40}
        height={40}
        alt=""
        className="translate-y-1 rounded-full"
      />
      <div className="w-full">
        <div className="flex items-center gap-1">
          <h2 className="font-bold text-base/7">{currentUser?.name}</h2>
          {currentUser?.verified && <VerifiedIcon />}
          <h3 className="text-font-2">{currentUser?.username}</h3>
          <h3 className="text-font-2">·</h3>
          <h3 className="text-font-2">
            {convertTimestampToDateTime(tweet.created_at)}
          </h3>
        </div>
        <pre className="leading-4" style={{ fontFamily: "Segoe UI" }}>
          {tweet.text}
        </pre>
        {/* Media */}
        <div
          className={`mt-3 ${
            tweet.media!.length > 1 &&
            "grid grid-cols-2 gap-1 rounded-xl overflow-hidden"
          }`}
        >
          {tweet.media !== null &&
            tweet.media.map((m, index) => (
              <Image
                key={index}
                src={m}
                width={600}
                height={172}
                alt=""
                className={`w-full border border-black/10 ${
                  tweet.media!.length > 1
                    ? "aspect-video object-cover"
                    : "max-w-[389px] rounded-xl"
                }`}
              />
            ))}
        </div>
        {/* Analytics */}
        <div className="flex justify-between gap-4 mt-3 ">
          <div className="flex items-center gap-2 duration-200 text-font-2 hover:text-primary group">
            <span className="p-2 duration-100 rounded-full group-hover:bg-primary/10">
              <FaRegComment />
            </span>
            {tweet.comments}
          </div>
          <div className="flex items-center gap-2 duration-200 text-font-2 hover:text-retweets group">
            <span className="p-2 duration-100 rounded-full group-hover:bg-retweets/10">
              <AiOutlineRetweet />
            </span>
            {tweet.retweets}
          </div>
          <div className="flex items-center gap-2 duration-200 text-font-2 hover:text-likes group">
            <span className="p-2 duration-100 rounded-full group-hover:bg-likes/10">
              <AiFillHeart />
            </span>
            {tweet.likes}
          </div>
          <div className="flex items-center gap-2 duration-200 text-font-2 hover:text-primary group">
            <span className="p-2 duration-100 rounded-full group-hover:bg-primary/10">
              <BsBarChartFill />
            </span>
            {formatLargeNumber(tweet.impressions)}
          </div>
        </div>
      </div>
    </div>
  );
}

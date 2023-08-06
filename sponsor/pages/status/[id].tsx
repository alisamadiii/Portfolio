import Tweet from "@/components/Tweet";
import { UserContext } from "@/context/User.context";
import { TweetType } from "@/types/User.t";
import { useRouter } from "next/router";
import React, { useContext, useEffect, useState } from "react";

type Props = {};

export default function SingleTweet({}: Props) {
  const [singleTweet, setSingleTweet] = useState<null | TweetType>(null);
  const { currentUser } = useContext(UserContext);

  const { query } = useRouter();

  useEffect(() => {
    const findTweet = currentUser?.tweets.find(
      (tweet) => tweet.id == Number(query.id)
    );

    setSingleTweet(findTweet!);
  }, [query]);

  if (singleTweet !== null) return <Tweet tweet={singleTweet} />;
}

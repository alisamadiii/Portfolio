import Tweet from "@/components/Tweet";
import { UserContext } from "@/context/User.context";
import React, { useContext } from "react";

type Props = {};

export default function Lists({}: Props) {
  const { currentUser } = useContext(UserContext);

  return (
    <div className="border-t border-button-hover">
      <div>
        {currentUser?.tweets.map((tweet) => (
          <Tweet key={tweet.id} tweet={tweet} />
        ))}
      </div>
    </div>
  );
}

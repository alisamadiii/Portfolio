import Button from "../components/Button";
import { UserContext } from "../context/User.context";
import VerifiedIcon from "../public/VerifiedIcon";
import Image from "next/image";
import { useContext } from "react";
import Linkify from "linkify-react";

// Icons
import { BsArrowLeftShort } from "react-icons/bs";
import { IoLocationOutline } from "react-icons/io5";
import { AiOutlineLink } from "react-icons/ai";
import { CgCalendarDates } from "react-icons/cg";
import { convertTimestampToDateTime, formatLargeNumber } from "../utils";
import Tweet from "../components/Tweet";

export default function Home() {
  const { currentUser } = useContext(UserContext);

  return (
    <>
      <header className="flex items-center gap-8 px-2 py-2">
        <Button className="p-1">
          <BsArrowLeftShort className="text-3xl" />
        </Button>
        <div>
          <div className="flex items-center gap-1">
            <h1 className="font-bold text-xl/5">{currentUser?.name}</h1>
            {currentUser?.verified && <VerifiedIcon />}
          </div>
          <small>{currentUser?.total_tweet.toLocaleString()} tweets</small>
        </div>
      </header>

      <section className="relative">
        <Image
          src={currentUser!.display_banner}
          width={600}
          height={172}
          alt=""
        />
        <Image
          src={currentUser!.display_URL}
          width={128}
          height={128}
          alt=""
          className="absolute -translate-y-1/2 border-4 border-white rounded-full left-4"
        />
      </section>

      <section className="px-4 mt-20 space-y-3">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="font-bold text-xl/7">{currentUser?.name}</h2>
            {currentUser?.verified && <VerifiedIcon />}
          </div>
          <p className="text-font-2">{currentUser?.username}</p>
        </div>

        <Linkify as={"p"} className="leading-5">
          {currentUser?.description.replaceAll("https://", "")}
        </Linkify>

        <div className="flex flex-wrap gap-x-4 text-font-2">
          <div className="flex items-center gap-1">
            <IoLocationOutline className="text-xl" />
            {currentUser?.location}
          </div>
          <div className="flex items-center gap-1">
            <AiOutlineLink className="text-xl" />
            <Linkify as={"p"}>
              {currentUser?.url.replaceAll("https://", "")}
            </Linkify>
          </div>
          <div className="flex items-center gap-1">
            <CgCalendarDates className="text-xl" />
            {currentUser?.joined}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 text-font-2">
          <p>
            <span className="font-bold text-secondary">
              {currentUser?.following}
            </span>{" "}
            Following
          </p>
          <p>
            <span className="font-bold text-secondary">
              {formatLargeNumber(currentUser?.followers)}
            </span>{" "}
            Followers
          </p>
        </div>
      </section>

      <section className="mt-8 border-t border-button-hover">
        <div>
          {currentUser?.tweets.map((tweet) => (
            <Tweet key={tweet.id} tweet={tweet} />
          ))}
        </div>
      </section>
    </>
  );
}

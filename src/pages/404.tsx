import { Heading1, Heading2 } from "@/components";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Countdown from "react-countdown";
import CountUp from "react-countup";

type Props = {};

export default function Not_Found({}: Props) {
  const [timer, setTimer] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    timer && router.push("/");
  }, [timer]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Heading1 className="py-3 animate-pulse">
        <CountUp start={0} end={404} duration={1} /> Page
      </Heading1>
      <div className="flex gap-3 mt-8 opacity-70">
        <p>Taking you to the home page:</p>
        <CountUp
          start={0}
          end={100}
          duration={3}
          separator=" "
          decimals={2}
          decimal=","
          suffix="%"
          onEnd={() => setTimer(true)}
        />
      </div>
    </div>
  );
}

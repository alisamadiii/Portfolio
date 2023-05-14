import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import CountUp from "react-countup";

import { Heading1 } from "@/components";

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

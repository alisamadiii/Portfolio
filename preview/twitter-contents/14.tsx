import React, { useState, useEffect } from "react";

import * as Element from "@/components/TwitterContentsElement";

export default function TwitterContents14() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Element.Wrapper>
      <Element.Preview>
        <h1 className="text-4xl font-bold">{time.toLocaleTimeString()}</h1>
      </Element.Preview>
    </Element.Wrapper>
  );
}

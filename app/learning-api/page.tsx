"use client";

import React, { useState } from "react";

export default function LearningAPIs() {
  const [data, setData] = useState<{ token: number; value: number }>({
    token: 0,
    value: 0,
  });

  const onClickHandler = async () => {
    const res = await fetch("/api/functions?func=rand", {
      method: "POST",
    });
    const data = await res.json();

    console.log(data);

    setData(data);
  };

  return (
    <div>
      <h1>{Math.round(data.token)}</h1>
      <h1>{data.value}</h1>
      <button onClick={onClickHandler}>Send Request</button>
    </div>
  );
}

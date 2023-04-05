import { useRouter } from "next/router";
import React, { useEffect } from "react";

type Props = {};

export default function Blogs({}: Props) {
  const router = useRouter();
  useEffect(() => {
    router.push("/#blog");
  }, []);
  return <div>index</div>;
}

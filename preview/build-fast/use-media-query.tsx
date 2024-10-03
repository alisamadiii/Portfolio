import React from "react";
import { useMediaQuery } from "@mantine/hooks";

import { Button } from "@/components/ui/button";

export default function UseMediaQuery() {
  const matches = useMediaQuery("(min-width: 768px)");

  return (
    <Button className={`${matches && "bg-primary"}`}>Use Media Query</Button>
  );
}

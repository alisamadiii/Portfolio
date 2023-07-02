import Counter from "@/components/AnimatedCounter";
import { usePageStore } from "@/context/Page_Context";
import Container from "@/layout/Container";
import React from "react";

type Props = {};

export default function BuildingWebsite({}: Props) {
  const { pageNum } = usePageStore();

  return (
    <Container className="mt-24">
      <Counter value={30 * pageNum} />
    </Container>
  );
}

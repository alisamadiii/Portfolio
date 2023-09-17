import React from "react";

import type { MessageValue } from "@/types/chat-history.t";

type Props = {
  message: MessageValue;
};

export default function EachMessage({ message }: Props) {
  return <div key={message.id}>{message.message}</div>;
}

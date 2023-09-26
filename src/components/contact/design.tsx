import React from "react";
import { Text } from "../ui/text";
import { useContactStore } from "@/context/Contact.context";

type Props = {};

export default function DesignPage({}: Props) {
  const { design, setDesign } = useContactStore();

  return (
    <div className="space-y-8">
      <Text size={48} className="text-foreground">
        Your UI design
      </Text>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Url"
          value={design.url}
          onChange={(e) => setDesign({ url: e.target.value })}
          className="w-full max-w-xl px-6 py-4 text-xl font-normal bg-transparent border-b outline-none"
        />
        <Text size={16} variant={"muted-sm"} className="max-w-xl text-right">
          drag and drop video or images
        </Text>
      </div>
    </div>
  );
}

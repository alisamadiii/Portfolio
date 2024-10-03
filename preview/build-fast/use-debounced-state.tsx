import React from "react";
import { useDebouncedState } from "@mantine/hooks";

export default function UseDebouncedState() {
  const [value, setValue] = useDebouncedState("", 200);

  return (
    <div>
      <input
        type="text"
        placeholder="type..."
        className="rounded-md border-wrapper p-2 outline-none"
        onChange={(event) => setValue(event.currentTarget.value)}
      />

      <p className="mt-4">Debounced value: {value}</p>
    </div>
  );
}

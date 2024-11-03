import React, { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export default function HotKeys() {
  const [copy, setCopy] = useState(false);

  useHotkeys("mod+c", () => setCopy(!copy));

  return (
    <div className="flex flex-col items-center">
      <button className="h-8 rounded-md bg-black px-4 text-white">
        {copy ? "Copied" : "Copy"}
      </button>
      <p className="mt-4 text-sm text-muted">
        <code>ctrl + c</code>
      </p>
    </div>
  );
}
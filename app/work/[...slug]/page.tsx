import React from "react";
import Link from "next/link";

export default function WorkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-natural-300/50 to-white p-4">
      <div className="max-w-2xl space-y-6 text-center">
        <h1 className="mb-4 flex items-center justify-center gap-2 text-xl font-bold text-black md:text-4xl">
          Source Code Access Changed
        </h1>
        <p className="text-neutral-800">
          This project is no longer open source. To access the complete source
          code, please visit:
        </p>
        <Link
          href="https://motion.alisamadii.com/"
          className="block text-xl font-medium text-blue-500 hover:text-blue-400"
        >
          motion.alismadii.com
        </Link>
      </div>
    </div>
  );
}

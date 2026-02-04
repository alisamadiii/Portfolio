"use client";

import { usePathname } from "next/navigation";

export const HeaderPage = () => {
  const pathname = usePathname();

  const title = pathname.split("/").pop() || "Dashboard";

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold capitalize md:text-4xl">{title}</h1>
    </div>
  );
};

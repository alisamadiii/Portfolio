import DesignNavbar from "@/components/design-navbar";
import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function DesignLayout({ children }: Props) {
  return (
    <div className="bg-white text-black">
      {children}
      <DesignNavbar />
    </div>
  );
}

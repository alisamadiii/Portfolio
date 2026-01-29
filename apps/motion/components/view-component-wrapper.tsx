import React from "react";

export const ViewComponentWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center-safe justify-center-safe py-8">
      {children}
    </div>
  );
};

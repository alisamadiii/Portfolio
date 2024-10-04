import React, { useState, ReactNode } from "react";
import { LayoutGroup } from "framer-motion";

import { cn } from "@/lib/utils";

interface FileProps {
  label: string;
  children: ReactNode;
}

export interface FilesProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export const Files: React.FC<FilesProps> = ({ children, id, className }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <div
        className={cn(
          "mx-auto flex h-[40px] max-w-xl items-center gap-1 rounded-t-md bg-natural-150 pl-2 pr-3 text-[13px] text-muted [&+div_figure]:my-0 [&+div_figure]:rounded-t-none [&+div_figure]:border-t-0",
          className
        )}
      >
        <LayoutGroup id={id}>
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return null;

            return (
              <button
                key={child.props.label}
                onClick={() => setActiveTab(index)}
                className={cn(
                  "relative p-1 text-natural-700",
                  activeTab !== index && "text-natural-500"
                )}
              >
                {child.props.label}
              </button>
            );
          })}
        </LayoutGroup>
      </div>
      <div>{React.Children.toArray(children)[activeTab]}</div>
    </>
  );
};

export const File: React.FC<FileProps> = ({ children }) => (
  <div>{children}</div>
);

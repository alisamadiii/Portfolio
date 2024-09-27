import React, { useState, ReactNode } from "react";
import { LayoutGroup, motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface FileProps {
  label: string;
  children: ReactNode;
}

interface FilesProps {
  id: string;
  children: ReactNode;
}

export const Files: React.FC<FilesProps> = ({ children, id }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <div className="flex h-[40px] items-center gap-1 rounded-t-md border-wrapper bg-code-figcaption pl-2 pr-3 text-[13px] text-muted [&+div_figure]:my-0 [&+div_figure]:rounded-t-none [&+div_figure]:border-t-0">
        <LayoutGroup id={id}>
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return null;

            return (
              <button
                key={child.props.label}
                onClick={() => setActiveTab(index)}
                className="relative p-1"
              >
                {activeTab === index && (
                  <motion.div
                    layoutId="tab-underline"
                    className="bg-background absolute inset-0 border-wrapper shadow-sm"
                    style={{ borderRadius: 6 }}
                  />
                )}

                <span
                  className={cn(
                    "text-foreground relative z-20",
                    activeTab !== index && "text-muted"
                  )}
                >
                  {child.props.label}
                </span>
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

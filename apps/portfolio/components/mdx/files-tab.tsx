import React, { ReactNode, useState } from "react";
import { LayoutGroup, motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

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
      <div className="border-wrapper bg-code-figcaption text-muted flex h-[40px] items-center gap-1 rounded-t-md pl-2 pr-3 text-[13px] [&+div_figure]:my-0 [&+div_figure]:rounded-t-none [&+div_figure]:border-t-0">
        <LayoutGroup id={id}>
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return null;

            return (
              <button
                key={(child as React.ReactElement<FileProps>).props.label}
                onClick={() => setActiveTab(index)}
                className="relative p-1"
              >
                {activeTab === index && (
                  <motion.div
                    layoutId="tab-underline"
                    className="bg-background border-wrapper absolute inset-0 shadow-sm"
                    style={{ borderRadius: 6 }}
                  />
                )}

                <span
                  className={cn(
                    "text-foreground relative z-20",
                    activeTab !== index && "text-muted"
                  )}
                >
                  {(child as React.ReactElement<FileProps>).props.label}
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

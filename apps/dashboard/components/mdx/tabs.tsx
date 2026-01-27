import React, { ReactNode, useState } from "react";
import { LayoutGroup, motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

interface TabProps {
  label: string;
  children: ReactNode;
}

interface TabsProps {
  id: string;
  children: ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children, id }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <LayoutGroup id={id}>
      <div className="border-b-code mb-4 flex">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={cn(
                "relative px-4 py-2 duration-200",
                activeTab !== index && "opacity-60"
              )}
            >
              {(child as React.ReactElement<TabProps>).props.label}

              {activeTab === index && (
                <motion.div
                  layoutId="tab-underline"
                  transition={{ duration: 0.4, type: "spring", bounce: 0 }}
                  className="bg-primary absolute bottom-0 left-0 h-0.5 w-full"
                />
              )}
            </button>
          );
        })}
      </div>
      <div>{React.Children.toArray(children)[activeTab]}</div>
    </LayoutGroup>
  );
};

export const Tab: React.FC<TabProps> = ({ children }) => <div>{children}</div>;

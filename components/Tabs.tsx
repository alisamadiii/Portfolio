import React, { useState, ReactNode } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabProps {
  label: string;
  children: ReactNode;
}

export interface TabsProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, id, className }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <LayoutGroup id={id}>
      <div
        className={cn("border-b-code mx-auto my-4 flex max-w-xl", className)}
      >
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
              {child.props.label}

              {activeTab === index && (
                <motion.div
                  layoutId="tab-underline"
                  transition={{ duration: 0.4, type: "spring", bounce: 0 }}
                  className="absolute bottom-0 left-0 h-0.5 w-full bg-primary"
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

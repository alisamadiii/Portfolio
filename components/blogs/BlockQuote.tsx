import React from "react";

type props = {
  children: React.ReactNode;
};

const BlockQuote = ({ children }: props) => {
  return (
    <blockquote className="p-4 italic border-2 border-primary dark:border-secondary bg-primary/50 dark:bg-secondary dark:bg-opacity-20 rounded-xl">
      {children}
    </blockquote>
  );
};

export default BlockQuote;

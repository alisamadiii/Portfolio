import React from "react";

type props = {
  children: React.ReactNode;
};

const BlockQuote = ({ children }: props) => {
  return (
    <blockquote className="p-4 italic border-2 border-slate-500 bg-slate-200 rounded-xl">
      {children}
    </blockquote>
  );
};

export default BlockQuote;

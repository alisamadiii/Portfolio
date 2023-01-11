import React from "react";

function SectionGradient() {
  return (
    <>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-l from-primary to-secondary"></div>
      <div className="absolute top-[-20%] left-0 w-1/2 h-[150px] 2xl:h-2/6 bg-secondary bg-opacity-60 rounded-[100%] blur-[150px] -z-10"></div>
      <div className="absolute top-[-20%] right-0 w-1/2 h-[150px] 2xl:h-2/6 bg-primary bg-opacity-20 rounded-[100%] blur-[150px] -z-10"></div>
    </>
  );
}

export default SectionGradient;

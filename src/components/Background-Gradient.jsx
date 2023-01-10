import React from "react";

function BackgroundGradient() {
  return (
    <div
      className="w-full h-[100vh] rounded-[100%] absolute top-[-50%] left-0 blur-[136px] pointer-events-none -z-50"
      style={{
        background:
          "linear-gradient(rgba(217, 217, 217, 0), rgba(0, 183, 194, 0.09), rgba(15, 76, 117, 0.19))",
      }}></div>
  );
}

export default BackgroundGradient;

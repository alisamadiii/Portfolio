import React, { useState } from "react";

import { IoEye, IoEyeOff } from "react-icons/io5";

export default function Password() {
  const [showPassword, setShowPassword] = useState(false);

  const onClickHandler = () => setShowPassword(!showPassword);

  return (
    <div className="w-full max-w-lg">
      <label className="">
        <p className="mb-1 text-[0.8125rem] font-medium">New password</p>
        <div className="flex h-9 w-full items-center rounded-[0.375rem] border border-[rgba(0,0,0,0.16)] px-4 duration-200 focus-within:shadow-[0px_0px_0px_1px_rgb(145,167,247)]">
          <input
            type={showPassword ? "text" : "password"}
            className="grow outline-none"
          />
          <button
            className="ml-2 flex items-center justify-center rounded p-0.5 text-[rgba(0,0,0,0.24)] duration-200 hover:text-[rgba(0,0,0,0.48)] focus:shadow-[0px_0px_0px_3px_rgb(145,167,247)]"
            onClick={onClickHandler}
          >
            {!showPassword ? <IoEye /> : <IoEyeOff />}
          </button>
        </div>
      </label>
    </div>
  );
}

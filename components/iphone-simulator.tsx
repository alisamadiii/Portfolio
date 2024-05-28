import { cn } from "@/utils";
import React from "react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  pillChildren?: React.ReactNode;
  topElements?: boolean;
  theme?: "light" | "dark";
  elementColor?: "light" | "dark";
}

export default function IphoneSimulator({
  children,
  pillChildren,
  theme = "dark",
  topElements = true,
  elementColor = "dark",
}: Props) {
  return (
    <div
      className={cn(
        "aspect-[4/8] w-full max-w-[393px] rounded-[64px] border",
        theme === "light"
          ? `bg-black p-1 ${elementColor === "light" ? "text-black" : "text-white"}`
          : "border-[#424242] bg-[#131313] p-2 text-white"
      )}
    >
      <div
        className={cn(
          "relative isolate flex h-full w-full flex-col overflow-hidden rounded-[58px]",
          theme === "light" ? "bg-white" : "bg-[#181818]"
        )}
      >
        <header className="grid grid-cols-4 items-center px-[45px] py-[10px]">
          <div>
            <motion.h3
              animate={{ opacity: topElements ? 1 : 0 }}
              className="text-sm mix-blend-exclusion"
            >
              9:41
            </motion.h3>
          </div>
          <div className="relative col-span-2 mx-auto h-[31px] w-[108px] rounded-full bg-black">
            {pillChildren}
          </div>
          <motion.div
            animate={{ opacity: topElements ? 1 : 0 }}
            className="flex items-center justify-end gap-2 mix-blend-exclusion"
          >
            <svg
              width="17"
              height="12"
              viewBox="0 0 17 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.745422"
                y="7.70483"
                width="2.36829"
                height="3.33716"
                rx="0.5"
                fill="currentColor"
              />
              <rect
                x="5.05341"
                y="5.5083"
                width="2.36829"
                height="5.53369"
                rx="0.7"
                fill="currentColor"
              />
              <rect
                x="9.36139"
                y="2.51978"
                width="2.36829"
                height="8.52222"
                rx="0.9"
                fill="currentColor"
              />
              <rect
                x="13.6696"
                y="0.656738"
                width="2.36829"
                height="10.3853"
                rx="0.9"
                fill="currentColor"
              />
            </svg>
            <svg
              width="15"
              height="11"
              viewBox="0 0 15 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.36409 8.716C9.24686 8.48262 9.05833 8.28288 9.01617 8.23807C8.93196 8.14859 8.80813 8.03384 8.64098 7.92042C8.30337 7.69129 7.79695 7.47339 7.10615 7.47339C6.41535 7.47339 5.90892 7.69129 5.57131 7.92042C5.40416 8.03384 5.28033 8.14859 5.19612 8.23807C5.16186 8.27436 5.12917 8.3121 5.09816 8.35119C5.08651 8.36596 4.97924 8.48262 4.84821 8.716L7.10615 10.9022L9.36409 8.716Z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.7791 6.40953C11.7791 6.40953 11.5584 6.12711 11.3455 5.88693C11.1804 5.70048 10.8458 5.39795 10.4924 5.15866C9.78108 4.67703 8.72817 4.19019 7.10612 4.19019C5.48406 4.19019 4.43116 4.67703 3.71987 5.15866C3.36643 5.39795 3.14462 5.58587 2.9228 5.82605C2.70098 6.06623 2.43314 6.40953 2.43314 6.40953L3.9968 7.91678L4.30153 7.57475L4.30669 7.5692C4.31221 7.56337 4.32185 7.55338 4.33552 7.5398C4.37744 7.49847 4.42081 7.45863 4.46553 7.42036C4.58409 7.31839 4.76435 7.17924 5.00318 7.03923C5.47998 6.7597 6.18696 6.47836 7.10612 6.47836C8.02528 6.47836 8.73226 6.7597 9.20906 7.03923C9.44788 7.17924 9.62815 7.31839 9.74671 7.42036C9.79143 7.45863 9.83479 7.49847 9.87672 7.5398C9.89039 7.55338 9.90002 7.56337 9.90555 7.5692L9.91071 7.57475L10.2154 7.91678L11.7791 6.40953Z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.1742 4.0924C14.1742 4.0924 14.0499 3.86158 13.847 3.63725C13.7258 3.5032 13.6753 3.43277 13.539 3.29182C13.2666 3.01 12.857 2.6389 12.2993 2.26915C11.1808 1.52752 9.47437 0.796875 7.10605 0.796875C4.73772 0.796875 3.03129 1.52752 1.91278 2.26915C1.35512 2.6389 0.945524 3.01 0.673097 3.29182C0.536787 3.43277 0.434575 3.55166 0.365081 3.63725C0.33032 3.68004 0.315824 3.69912 0.285067 3.7394C0.182965 3.87317 0.0379028 4.0924 0.0379028 4.0924L1.64094 5.63505L1.94476 5.27609L1.94707 5.27339C1.94952 5.27055 1.95384 5.26568 1.96002 5.25878C1.97942 5.23722 1.99915 5.21597 2.01922 5.19503C2.07339 5.13826 2.15669 5.05469 2.26826 4.95316C2.49168 4.74993 2.82698 4.47607 3.26744 4.20159C4.14795 3.65293 5.44238 3.10523 7.10605 3.10523C8.76971 3.10523 10.0641 3.65293 10.9447 4.20159C11.3851 4.47607 11.7204 4.74993 11.9438 4.95316C12.0554 5.05469 12.1387 5.13826 12.1929 5.19503C12.2129 5.21597 12.2327 5.23722 12.2521 5.25878C12.2583 5.26568 12.2626 5.27055 12.265 5.27339L12.266 5.27454L12.2672 5.27595L12.5712 5.63505L14.1742 4.0924Z"
                fill="currentColor"
              />
            </svg>
            <svg
              width="22"
              height="10"
              viewBox="0 0 22 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.3729 4.71301C21.4445 4.78982 21.4445 4.90891 21.3729 4.98573L20.7381 5.66689C20.6143 5.79973 20.3918 5.71212 20.3918 5.53053V4.1682C20.3918 3.98661 20.6143 3.899 20.7381 4.03184L21.3729 4.71301Z"
                fill="#675555"
              />
              <rect
                x="1.0752"
                y="1.03394"
                width="18.046"
                height="7.63086"
                rx="1.5"
                fill="currentColor"
              />
              <rect
                x="0.374194"
                y="0.426074"
                width="19.4481"
                height="8.84639"
                rx="1.8"
                stroke="#675555"
                strokeWidth="0.4"
              />
            </svg>
          </motion.div>
        </header>
        <main className="no-scrollbar -z-10 grow overflow-auto">
          {children}
        </main>
        <footer className="flex justify-center py-[10px]">
          <div
            className={cn(
              "h-1 w-full max-w-[119px] rounded-full mix-blend-exclusion",
              elementColor === "light" ? "bg-black" : "bg-white"
            )}
          ></div>
        </footer>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { eachDayOfInterval, endOfYear, parse } from "date-fns";

import ListsWrapper, { ListsWrapperNoOptimization } from "./lists-wrapper";

export default function Day3() {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(null);

  const [displayDate, setDisplayDate] = useState<string | null>(null);

  const onClickHandler = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative h-screen max-h-[696px] w-full max-w-[561px] overflow-hidden rounded-[14px] bg-[#0D0D0D] p-3 text-white shadow-[0px_8px_66px_19px_rgba(0,0,0,0.28)]">
      <button
        className="flex h-14 w-full flex-col justify-center rounded-md border border-[#333] bg-[#1c1c1c] px-4 text-start text-white"
        onClick={onClickHandler}
      >
        <small className="mb-px text-xs">Compact date and time picker</small>
        <p className="text-[#919191]">
          {displayDate ? displayDate.toString() : "Please select..."}
        </p>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, type: "spring", bounce: 0 }}
            className="absolute bottom-0 left-0 w-full bg-[rgb(28,28,28)]"
          >
            <div className="flex h-12 w-full items-center justify-between bg-[#292929] px-4">
              <button
                className="text-[#ff9f0a] duration-200 hover:text-opacity-80"
                onClick={onClickHandler}
              >
                Cancel
              </button>
              <button
                className="text-[#ff9f0a] duration-200 hover:text-opacity-80"
                onClick={() => {
                  setDisplayDate(date);
                  setIsOpen(false);
                }}
              >
                Done
              </button>
            </div>

            <DateLists setDate={setDate} />
            {/* <DateLists2 /> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getDaysFromTodayUntilEndOfYear() {
  const today = new Date();
  const endOfThisYear = endOfYear(today);

  const daysFromToday = eachDayOfInterval({
    start: today,
    end: endOfThisYear,
  });

  return daysFromToday;
}

//! Date Lists
//! 1
function DateLists({ setDate }: { setDate: (a: any) => void }) {
  const [day, setDay] = useState<any | null>(null);
  const [minute, setMinute] = useState<any | null>(null);
  const [hour, setHour] = useState<any | null>(null);
  const [time, setTime] = useState<any | null>(null);

  const daysFrom2015To2030 = [
    "",
    "",
    "",
    ...getDaysFromTodayUntilEndOfYear(),
    "",
    "",
    "",
  ];

  const minutes: Array<string | number> = [];

  // Fill the array with minutes from 0 to 59
  for (let i = 1; i <= 60; i++) {
    minutes.push(i);
  }

  // Add empty strings before and after the minutes array as needed
  const finalMinutes: Array<string | number> = [
    "",
    "",
    "",
    ...minutes,
    "",
    "",
    "",
  ];

  const hours = ["", "", "", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "", "", ""];
  const timeValues = ["", "", "", "AM", "PM", "", "", ""];

  console.log(day, minute, hour, time);

  useEffect(() => {
    const dateString = `${day} ${hour} ${minute} ${time}`;
    const formatString = "yyyy-MM-dd h m a";

    const parsedDate = parse(dateString, formatString, new Date());

    setDate(parsedDate);
  }, [day, minute, hour, time]);

  return (
    <div className="relative grid w-full grid-cols-5 gap-8 px-12 text-[1.4rem]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[33px] w-full -translate-x-1/2 -translate-y-1/2 border-y-[0.33px] border-[#3D3D3D]"></div>
      {/* Top */}
      {/* <div className="pointer-events-none absolute left-0 top-0 z-10 h-[90px] w-full bg-gradient-to-b from-[#252525] to-transparent"></div> */}
      {/* Bottom */}
      {/* <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-[90px] w-full bg-gradient-to-t from-[#252525] to-transparent"></div> */}

      <div
        className="pointer-events-none absolute -inset-1 z-10"
        style={{
          background:
            "linear-gradient(180deg, #252525 0%, rgba(28,28,28, 0.49) 38.5%, rgba(28,28,28, 0.00) 50%, rgba(28,28,28, 0.37) 59.5%, #252525 100%)",
        }}
      ></div>

      <ListsWrapper
        data={daysFrom2015To2030}
        id="1"
        type="date"
        className="col-span-2"
        setValue={setDay}
      />
      <ListsWrapperNoOptimization
        data={hours}
        name="hours"
        setValue={setHour}
      />
      <ListsWrapperNoOptimization
        data={finalMinutes}
        name="minutes"
        setValue={setMinute}
      />
      <ListsWrapperNoOptimization
        data={timeValues}
        name="time"
        setValue={setTime}
      />
    </div>
  );
}

// //! 2
// function DateLists2() {
//   const listRef = useRef<HTMLUListElement>(null);

//   const daysFrom2015To2030 = getAllDays(2024, 2025);

//   console.log(listRef.current);

//   const [scrollTop, setScrollTop] = useState(0);
//   const rowHeight = 33;

//   useEffect(() => {
//     const onScroll = () => {
//       if (listRef.current) {
//         setScrollTop(listRef.current.scrollTop);
//       }
//     };
//     const listElement = listRef.current;
//     listElement.addEventListener("scroll", onScroll);
//     return () => {
//       listElement.removeEventListener("scroll", onScroll);
//     };
//   }, []);

//   return (
//     <ul
//       ref={listRef}
//       className="flex h-[208px] w-full flex-col overflow-auto px-4 text-end"
//     >
//       {daysFrom2015To2030.map((day, dIndex) => {
//         const middleIndex =
//           Math.floor(scrollTop / rowHeight) + Math.floor(208 / rowHeight / 2);
//         const distanceFromMiddle = Math.abs(dIndex - middleIndex);
//         const opacity =
//           distanceFromMiddle === 0 ? 1 : 1 / (distanceFromMiddle + 3);
//         const rotateX = distanceFromMiddle * 20; // Adjust this value to control the rotation angle

//         const combinedStyle = {
//           opacity,
//           transform: `rotateX(${rotateX}deg)`,
//           transformOrigin: "center",
//           height: `${rowHeight}px`,
//           display: "flex",
//           alignItems: "center",
//           flex: "0 0 auto",
//           transition: "200ms opacity",
//         };

//         return (
//           <li
//             key={dIndex}
//             className="flex h-[33px] items-center justify-end"
//             style={combinedStyle}
//           >
//             <time dateTime={format(day, "yyyy-MM-dd")} className="text-xl">
//               {isToday(day) ? "Today" : format(day, "eee M d")}
//             </time>
//           </li>
//         );
//       })}
//     </ul>
//   );
// }

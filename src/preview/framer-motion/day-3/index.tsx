"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { eachDayOfInterval, startOfYear, endOfYear } from "date-fns";

import ListsWrapper from "./lists-wrapper";

export default function Day3() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => {
    setIsOpen(!isOpen);
  };

  //! date-fns
  // let today = startOfToday();

  // let newDays = eachDayOfInterval({
  //   start: startOfMonth(today),
  //   end: endOfMonth(today),
  // });

  return (
    <div className="relative h-screen max-h-[696px] w-full max-w-[561px] overflow-hidden rounded-[14px] bg-[#0D0D0D] p-3 text-white shadow-[0px_8px_66px_19px_rgba(0,0,0,0.28)]">
      <button
        className="flex h-14 w-full flex-col justify-center rounded-md border border-[#333] bg-[#1c1c1c] px-4 text-start text-white"
        onClick={onClickHandler}
      >
        <small className="mb-px text-xs">Compact date and time picker</small>
        <p className="text-[#919191]">Please select...</p>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, type: "spring", bounce: 0 }}
            className="absolute bottom-0 left-0 w-full bg-[#1c1c1c]"
          >
            <div className="flex h-12 w-full items-center justify-between bg-[#292929] px-4">
              <button
                className="text-[#ff9f0a] duration-200 hover:text-opacity-80"
                onClick={onClickHandler}
              >
                Cancel
              </button>
              <button className="text-[#ff9f0a] duration-200 hover:text-opacity-80">
                Done
              </button>
            </div>

            <DateLists />
            {/* <DateLists2 /> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getAllDays(startYear: number, endYear: number) {
  let allDays: any[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const daysInYear = eachDayOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 11, 31)),
    });

    allDays = allDays.concat(daysInYear);
  }

  return allDays;
}

//! Date Lists
//! 1
function DateLists() {
  const daysFrom2015To2030 = [
    "",
    "",
    "",
    ...getAllDays(2024, 2024),
    "",
    "",
    "",
  ];

  const hours = ["", "", "", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "", "", ""];
  const time = ["", "", "", "AM", "PM", "", "", ""];

  return (
    <div className="relative flex w-full gap-8 px-4">
      <div className="pointer-events-none absolute left-0 top-1/2 -z-10 h-[33px] w-full -translate-y-1/2 rounded-md bg-[hsla(0,0%,100%,.1)]"></div>

      <ListsWrapper data={daysFrom2015To2030} id="1" type="date" />
      <ListsWrapper data={hours} id="2" type="any" />
      <ListsWrapper data={time} id="3" type="any" />
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

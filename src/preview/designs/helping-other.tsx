import { AnimatePresence, motion } from "framer-motion";
import { type SVGProps, useState } from "react";

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="size-12"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <title>svg</title>
      <path
        fill="currentColor"
        d="M4 19v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-3q-.425 0-.712-.288T14 20v-5q0-.425-.288-.712T13 14h-2q-.425 0-.712.288T10 15v5q0 .425-.288.713T9 21H6q-.825 0-1.412-.587T4 19"
      />
    </svg>
  );
}

export function Back(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="size-12"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <title>svg</title>
      <path
        fill="currentColor"
        d="m5.916 12.5l3.746 3.746q.14.14.15.345q.01.203-.15.363t-.354.16t-.354-.16l-4.389-4.389q-.13-.13-.183-.267q-.053-.136-.053-.298t.053-.298t.184-.267l4.388-4.389q.14-.14.344-.15t.364.15t.16.354t-.16.354L5.916 11.5H19.5q.214 0 .357.143T20 12t-.143.357t-.357.143z"
      />
    </svg>
  );
}

export function Edit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="size-12"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <title>svg</title>
      <path
        fill="currentColor"
        d="M10 15q-.425 0-.712-.288T9 14v-2.425q0-.4.15-.763t.425-.637l8.6-8.6q.3-.3.675-.45t.75-.15q.4 0 .763.15t.662.45L22.425 3q.275.3.425.663T23 4.4t-.137.738t-.438.662l-8.6 8.6q-.275.275-.637.438t-.763.162zm9.6-9.2l1.425-1.4l-1.4-1.4L18.2 4.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6.5q.35 0 .575.175t.35.45t.087.55t-.287.525l-4.65 4.65q-.275.275-.425.638T7 10.75V15q0 .825.588 1.412T9 17h4.225q.4 0 .763-.15t.637-.425L19.3 11.75q.25-.25.525-.288t.55.088t.45.35t.175.575V19q0 .825-.587 1.413T19 21z"
      />
    </svg>
  );
}

export function Dots(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="size-12"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
    >
      <title>svg</title>
      <path
        fill="currentColor"
        d="M144 128a16 16 0 1 1-16-16a16 16 0 0 1 16 16m-84-16a16 16 0 1 0 16 16a16 16 0 0 0-16-16m136 0a16 16 0 1 0 16 16a16 16 0 0 0-16-16"
      />
    </svg>
  );
}

type Nav = "home" | "edit" | "view";

function getActiveNav(nav: Nav) {
  switch (nav) {
    case "home":
      return (
        <motion.div
          key="home"
          className="flex flex-row items-center justify-between gap-2"
        >
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <HomeIcon />
          </motion.div>
          <motion.div>
            <HomeIcon />
          </motion.div>
          <motion.div layoutId="edit">
            <Edit />
          </motion.div>
          <motion.div>
            <HomeIcon />
          </motion.div>
          <motion.div>
            <HomeIcon />
          </motion.div>
        </motion.div>
      );

    case "edit":
      return (
        <motion.div
          key="edit-icon"
          className="flex flex-row items-center justify-between gap-2"
        >
          <motion.div layoutId="left">
            <Back />
          </motion.div>
          <motion.div layoutId="edit">
            <Edit />
          </motion.div>
          <Dots />
        </motion.div>
      );

    case "view":
      return (
        <motion.div
          key="view-icon"
          className="flex flex-row items-center justify-between gap-2"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          <motion.div layoutId="left">
            <Back />
          </motion.div>
          <motion.div>
            <HomeIcon />
          </motion.div>
          <Dots />
        </motion.div>
      );
    default:
      return null;
  }
}

export default function LinearAppNav() {
  const [currentNav, setCurrentNav] = useState<Nav>("home");

  return (
    <div className="relative m-5 flex w-full flex-col">
      <button
        type="button"
        className="mx-auto my-5"
        onClick={() => {
          setCurrentNav((p) => {
            if (p === "home") {
              return "edit";
            }
            // if (p === 'edit') {
            //   return 'view';
            // }
            return "home";
          });
        }}
      >
        Change Nav
      </button>
      <AnimatePresence mode="popLayout">
        {getActiveNav(currentNav)}
      </AnimatePresence>
    </div>
  );
}

import Image from "next/image";
import React, { useState } from "react";
import { motion } from "framer-motion";

const initialValues = [
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1557862921-37829c790f19?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 6,
    url: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
];

export default function ExpandProfilesPicture() {
  const [expand, setExpand] = useState(false);

  const onExpandHandler = () => setExpand(!expand);

  return (
    <div className="flex flex-col items-center">
      <div className={`${expand ? "flex gap-4" : "-space-y-[58px]"}`}>
        {initialValues.map((value, index) => (
          <motion.div
            layoutId={value.id.toString()}
            key={value.id}
            animate={{
              height: expand ? 128 : 48,
              width: expand ? 128 : 48,
              opacity: expand ? 1 : 1 - index / initialValues.length,
            }}
            className="relative isolate h-12 w-12 cursor-pointer first-of-type:z-20 last-of-type:-z-10"
            onClick={onExpandHandler}
            // style={{ opacity: 1 - index / values.length }}
          >
            <Image
              src={value.url}
              width={300}
              height={300}
              alt=""
              className="pointer-events-none h-full w-full rounded-full object-cover"
            />
            <div className="absolute -inset-0.5 -z-10 rounded-full bg-white"></div>
          </motion.div>
        ))}
      </div>
      <p className="mt-12 px-4 text-center text-sm text-gray-700">
        Click any image to expand.
      </p>
    </div>
  );
}

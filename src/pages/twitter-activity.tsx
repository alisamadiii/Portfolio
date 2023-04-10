import { ANIMATED_CONTENTS } from "@/contents/Animated_Contents";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {};

import { AiOutlineTwitter } from "react-icons/ai";

export default function Twitter_Activity({}: Props) {
  const [searchField, setSearchField] = useState("");
  const [contents, setContents] = useState(ANIMATED_CONTENTS);
  const [filter, setFilter] = useState(contents);

  useEffect(() => {
    const filterContents = contents.filter((content) =>
      content.name.toLocaleLowerCase().includes(searchField.toLocaleLowerCase())
    );

    setFilter(filterContents);
  }, [searchField]);

  return (
    <div className="mt-28 w-full max-w-[700px] mx-auto px-4">
      <h1 className="text-3xl font-extrabold tracking-tight">
        My Twitter Activities
      </h1>
      <p className="mt-2 font-medium opacity-70">
        I am making animated contents which are being loved by most of the
        people.
      </p>
      <input
        type="text"
        placeholder="search..."
        className="w-full p-2 mt-4 font-medium duration-200 bg-transparent border-2 rounded-lg outline-none border-primary/50 focus:border-primary"
        value={searchField}
        onChange={(e) => setSearchField(e.target.value)}
      />
      <motion.div layout="size" className="pb-24 mt-8 space-y-3">
        <AnimatePresence>
          {filter.map((content) => (
            <motion.div
              layout="position"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: content.content * 0.05 },
              }}
              exit={{ opacity: 0 }}
              key={content.content}
              className="flex items-center justify-between gap-4 px-4 py-2 border-l-4 rounded-r-lg group border-primary hover:bg-primary/5"
              style={{ transition: "background .3s" }}
            >
              <div>
                <h2 className="text-lg font-medium">{content.name}</h2>
                <p className="text-sm">{content.description}</p>
              </div>
              <a
                href={content.link}
                target="_blank"
                className="text-2xl duration-200 group-hover:text-twitter"
              >
                <AiOutlineTwitter />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

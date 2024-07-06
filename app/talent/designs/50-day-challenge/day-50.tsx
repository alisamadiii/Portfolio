"use client";

import React, { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import useMeasure from "react-use-measure";
import { AnimatePresence, motion } from "framer-motion";

interface initialTypes {
  id: number;
  question: string;
  answer: string;
}

const initialValues: initialTypes[] = [
  {
    id: 1,
    question: "What is web development?",
    answer:
      "Web development is the process of building and maintaining websites. It involves a range of tasks, including web design, web content creation, client-side/server-side scripting, and network security configuration. Web development can be broken down into front-end (client-side) and back-end (server-side) development.",
  },
  {
    id: 2,
    question:
      "What is the difference between front-end and back-end development?",
    answer:
      "Front-end development focuses on the visual aspects of a website that users interact with, such as layout, design, and user interface. Common technologies used include HTML, CSS, and JavaScript. Back-end development, on the other hand, deals with the server, database, and application logic. It involves server-side languages like Node.js, Python, Ruby, and PHP, as well as database management systems like MySQL and MongoDB.",
  },
  {
    id: 3,
    question: "How long does it take to build a website?",
    answer:
      "The time it takes to build a website can vary greatly depending on the complexity and requirements of the project. A simple website with a few pages can take a few weeks to develop, while a more complex site with custom features, integrations, and extensive content can take several months. Planning, design, development, testing, and revisions all contribute to the timeline.",
  },
  {
    id: 4,
    question: "What is responsive web design, and why is it important?",
    answer:
      "Responsive web design is an approach to web development that ensures a website looks and functions well on a variety of devices and screen sizes, from desktop computers to smartphones and tablets. It's important because it improves the user experience, increases the time users spend on your site, and is favored by search engines, which can improve your site's search ranking.",
  },
  {
    id: 5,
    question: "What are the best practices for improving website performance?",
    answer:
      "Improving website performance involves several best practices:\n- Optimize images: Use the appropriate file format and compression techniques to reduce image sizes without sacrificing quality.\n- Minimize HTTP requests: Reduce the number of elements on a page, such as scripts, images, and CSS files.\n- Use a Content Delivery Network (CDN): Distribute content across multiple servers to reduce latency and load times.\n- Enable browser caching: Allow browsers to store static files so they don't need to be reloaded each time a user visits your site.\n- Minify CSS, JavaScript, and HTML: Remove unnecessary characters and spaces to reduce file sizes and improve load times.",
  },
];

export default function Day50() {
  const [selectedFaq, setSelectedFaq] = useState(1);

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl">
      {initialValues.map((value) => (
        <EachFAQ
          key={value.id}
          value={value}
          selectedFaq={selectedFaq}
          setSelectedFaq={setSelectedFaq}
        />
      ))}
    </div>
  );
}

function EachFAQ({
  value,
  selectedFaq,
  setSelectedFaq,
}: {
  value: initialTypes;
  selectedFaq: number;
  setSelectedFaq: (a: number) => void;
}) {
  const onClickHandler = () => {
    if (value.id === selectedFaq) {
      return setSelectedFaq(0);
    }

    setSelectedFaq(value.id);
  };

  const [ref, { height }] = useMeasure();

  return (
    <motion.div
      animate={{ height: height > 0 ? height : undefined }}
      className="relative w-full overflow-hidden bg-box"
    >
      <div ref={ref}>
        <button
          className="flex w-full items-center justify-between gap-8 p-4 text-start text-lg"
          onClick={onClickHandler}
        >
          {value.question}{" "}
          <motion.span
            animate={{ rotateX: selectedFaq === value.id ? 180 : 0 }}
          >
            <IoIosArrowDown />
          </motion.span>
        </button>
        <AnimatePresence mode="popLayout" initial={false}>
          {selectedFaq === value.id ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.2 } }}
              exit={{ opacity: 0, position: "absolute" }}
              className="p-4 text-muted-2"
            >
              {value.answer}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

// import React from "react";

// export default function Day44() {
//   const controls = useAnimation();

//   React.useEffect(() => {
//     const animate = async () => {
//       await controls.start({
//         x1: ["-13%", "100%"],
//         x2: ["0%", "113%"],
//         transition: {
//           x1: {
//             repeat: Infinity,
//             repeatType: "loop",
//             duration: 5,
//             ease: "linear",
//           },
//           x2: {
//             repeat: Infinity,
//             repeatType: "loop",
//             duration: 5,
//             ease: "linear",
//           },
//         },
//       });
//     };
//     console.log("rendering");
//     animate();
//   }, [controls]);

//   return (
//     <div>
//       <svg
//         width="335"
//         height="163"
//         viewBox="0 0 335 163"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         className="text-neutral-600"
//       >
//         <g opacity="0.75">
//           <path
//             d="M335 151L317.491 36.2214C317.166 34.0879 316.477 32.0245 315.57 30.0659C307.713 13.0898 308.853 1 284 1C257.738 1 244.262 37.1622 218 37.1622C191.738 37.1622 195.262 67.5 169 67.5C142.738 67.5 141.262 37.1622 115 37.1622C88.7381 37.1622 88.7141 76.5675 62.4522 76.5675C36.1902 76.5675 36.1902 54.6756 9.9283 54.6756H0"
//             stroke="currentColor"
//             strokeWidth="1.5"
//           ></path>
//         </g>
//         <path
//           d="M335 151L317.491 36.2214C317.166 34.0879 316.477 32.0245 315.57 30.0659C307.713 13.0898 308.853 1 284 1C257.738 1 244.262 37.1622 218 37.1622C191.738 37.1622 195.262 67.5 169 67.5C142.738 67.5 141.262 37.1622 115 37.1622C88.7381 37.1622 88.7141 76.5675 62.4522 76.5675C36.1902 76.5675 36.1902 54.6756 9.9283 54.6756H0"
//           stroke="url(#gradient-3)"
//           strokeWidth="1.5"
//         ></path>
//         <motion.linearGradient
//           id="gradient-3"
//           animate={controls}
//           y1="0%"
//           y2="0%"
//         >
//           <stop stopColor="#001AFF" stopOpacity="0"></stop>
//           <stop offset="1" stopColor="#6DD4F5"></stop>
//           <stop offset="1" stopColor="#6DD4F5" stopOpacity="0"></stop>
//         </motion.linearGradient>
//       </svg>
//     </div>
//   );
// }

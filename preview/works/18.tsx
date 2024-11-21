import React, { useState } from "react";
import { motion, MotionConfig } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const initialValues = [
  {
    title: "React.js",
    info: "A JavaScript library for building user interfaces",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 9.237C8.69036 9.237 9.25 8.67736 9.25 7.987C9.25 7.29664 8.69036 6.737 8 6.737C7.30964 6.737 6.75 7.29664 6.75 7.987C6.75 8.67736 7.30964 9.237 8 9.237Z"
          fill="#00D8FF"
        />
        <path
          d="M8 10.853C6.49757 10.8892 4.99892 10.6867 3.56 10.253C2.89531 10.0423 2.27537 9.71037 1.7315 9.274C1.52389 9.125 1.35101 8.93281 1.22474 8.71064C1.09847 8.48848 1.0218 8.24161 1 7.987C1 7.1605 1.908 6.3505 3.429 5.8205C4.90646 5.35126 6.44999 5.12366 8 5.1465C9.52934 5.12535 11.0522 5.34884 12.511 5.8085C13.151 6.01281 13.7499 6.32867 14.28 6.7415C14.4838 6.88384 14.6538 7.06914 14.7782 7.28433C14.9026 7.49953 14.9783 7.73938 15 7.987C15 8.846 13.985 9.7165 12.35 10.2575C10.939 10.6772 9.47192 10.878 8 10.853ZM8 5.7445C6.51709 5.72512 5.04051 5.94148 3.6255 6.3855C2.2255 6.874 1.598 7.542 1.598 7.9855C1.598 8.4495 2.2725 9.179 3.7535 9.6855C5.13002 10.0985 6.5633 10.2907 8 10.255C9.4082 10.2802 10.812 10.0896 12.1625 9.69C13.7 9.1805 14.4 8.45 14.4 7.987C14.3747 7.82814 14.3167 7.67625 14.2298 7.54088C14.1429 7.40552 14.0289 7.28963 13.895 7.2005C13.4208 6.83412 12.8858 6.55418 12.3145 6.3735C10.9189 5.93569 9.46247 5.72336 8 5.7445Z"
          fill="#00D8FF"
        />
        <path
          d="M5.16005 14.2215C4.9268 14.2268 4.69631 14.1702 4.49205 14.0575C3.77605 13.6445 3.52805 12.4535 3.82855 10.871C4.16025 9.35666 4.73431 7.90582 5.52855 6.5745C6.27409 5.23917 7.22829 4.0316 8.35505 2.9975C8.85178 2.54505 9.4246 2.184 10.047 1.931C10.2723 1.82577 10.5179 1.77123 10.7665 1.77123C11.0152 1.77123 11.2608 1.82577 11.486 1.931C12.2305 2.36 12.477 3.674 12.1295 5.3605C11.788 6.79279 11.2289 8.16424 10.4715 9.427C9.75231 10.7466 8.82814 11.9437 7.73355 12.9735C7.21894 13.4439 6.62172 13.815 5.97205 14.068C5.71203 14.1648 5.43745 14.2167 5.16005 14.2215ZM6.04655 6.8715C5.289 8.14636 4.7388 9.53348 4.41655 10.981C4.14005 12.4385 4.40555 13.315 4.79155 13.538C5.19155 13.7695 6.16255 13.55 7.34155 12.52C8.38662 11.5335 9.26873 10.3876 9.95505 9.125C10.6805 7.91776 11.2169 6.60657 11.5455 5.237C11.8725 3.6495 11.59 2.6775 11.189 2.4465C11.0387 2.389 10.8781 2.36327 10.7174 2.37093C10.5566 2.37859 10.3992 2.41947 10.255 2.491C9.70092 2.71973 9.19145 3.04436 8.75005 3.45C7.67361 4.4406 6.76215 5.59664 6.05005 6.8745L6.04655 6.8715Z"
          fill="#00D8FF"
        />
        <path
          d="M10.8385 14.228C10.161 14.228 9.30046 13.818 8.40446 13.0475C7.2581 12.0039 6.28777 10.782 5.53096 9.429C4.74652 8.11608 4.177 6.68621 3.84396 5.1935C3.69987 4.53671 3.67313 3.8596 3.76496 3.1935C3.78656 2.94648 3.86192 2.70717 3.98578 2.49236C4.10964 2.27755 4.279 2.09244 4.48196 1.95C5.22546 1.5195 6.48696 1.962 7.77446 3.105C8.84476 4.11609 9.75366 5.28535 10.4695 6.572C11.2535 7.85423 11.829 9.2528 12.1745 10.7155C12.325 11.3963 12.3482 12.0992 12.243 12.7885C12.218 13.0427 12.1383 13.2885 12.0094 13.5091C11.8804 13.7296 11.7053 13.9196 11.496 14.066C11.295 14.1771 11.0681 14.233 10.8385 14.228ZM6.04846 9.128C6.77454 10.421 7.70143 11.5904 8.79446 12.5925C9.91896 13.56 10.811 13.768 11.1945 13.5425C11.5945 13.31 11.8895 12.361 11.5855 10.8255C11.2525 9.42893 10.7005 8.0939 9.94996 6.87C9.26688 5.63856 8.39933 4.51893 7.37746 3.55C6.16546 2.474 5.18246 2.2335 4.78196 2.4655C4.6572 2.567 4.55481 2.69323 4.48124 2.83625C4.40766 2.97927 4.3645 3.13598 4.35446 3.2965C4.27503 3.89054 4.30093 4.49394 4.43096 5.079C4.7514 6.50648 5.2976 7.87367 6.04896 9.129L6.04846 9.128Z"
          fill="#00D8FF"
        />
      </svg>
    ),
  },
  {
    title: "Next.js",
    info: "A React framework for production-grade applications",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.00004 14.6667C4.31804 14.6667 1.33337 11.682 1.33337 8C1.33337 4.318 4.31804 1.33334 8.00004 1.33334C11.682 1.33334 14.6667 4.318 14.6667 8C14.6667 11.682 11.682 14.6667 8.00004 14.6667ZM10.6667 5.33334H9.76671V8H10.6667V5.33334ZM6.23071 6.47334L10.27 11.692L10.9727 11.1527L6.45537 5.33334H5.33337V10.6647H6.23071V6.47334Z"
          fill="black"
        />
      </svg>
    ),
  },
  {
    title: "Tailwind CSS",
    info: "A utility-first CSS framework for rapid styling",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clip-path="url(#clip0_75_18)">
          <path
            d="M8.00049 3.20025C5.86711 3.20025 4.53424 4.2665 4.00049 6.39987C4.80024 5.3335 5.73386 4.93362 6.80024 5.20025C7.40911 5.352 7.84424 5.7935 8.32611 6.28275C9.11036 7.07862 10.0181 8 12.0005 8C14.1337 8 15.4667 6.93362 16.0005 4.79975C15.2005 5.86667 14.2672 6.26675 13.2006 6C12.5919 5.84812 12.1572 5.40675 11.6747 4.9175C10.891 4.12162 9.98349 3.20025 8.00049 3.20025ZM4.00049 8C1.86724 8 0.534238 9.06637 0.000488281 11.2002C0.800405 10.1333 1.73366 9.73325 2.80024 10C3.40911 10.1519 3.84424 10.5932 4.32611 11.0825C5.11036 11.8784 6.01811 12.7997 8.00049 12.7997C10.1337 12.7997 11.4667 11.7335 12.0005 9.60012C11.2005 10.6665 10.2672 11.0664 9.20061 10.7997C8.59186 10.648 8.15724 10.2065 7.67474 9.71725C6.89099 8.92137 5.98349 8 4.00049 8Z"
            fill="#38BDF8"
          />
        </g>
        <defs>
          <clipPath id="clip0_75_18">
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    ),
  },
  {
    title: "TypeScript",
    info: "A typed superset of JavaScript for safer code",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.3919 1.61514H4.60801C2.95508 1.61514 1.61511 2.95511 1.61511 4.60804V11.392C1.61511 13.0449 2.95508 14.3849 4.60801 14.3849H11.3919C13.0449 14.3849 14.3848 13.0449 14.3848 11.392V4.60804C14.3848 2.95511 13.0449 1.61514 11.3919 1.61514Z"
          fill="#007ACC"
        />
        <path
          d="M4.43898 8.04235L4.43494 8.56531H6.09699V13.2881H7.27266V8.56531H8.93471V8.05248C8.93471 7.7687 8.92868 7.53156 8.92055 7.52548C8.91446 7.5174 7.90301 7.51331 6.67672 7.51535L4.44506 7.52144L4.43898 8.04235ZM11.919 7.50657C12.2433 7.58768 12.4906 7.73159 12.7176 7.96668C12.8352 8.09238 13.0095 8.32144 13.0237 8.37616C13.0278 8.39237 12.4724 8.76534 12.1359 8.97409C12.1238 8.98222 12.0751 8.9295 12.0203 8.84844C11.8562 8.60926 11.6839 8.50585 11.4204 8.48765C11.0332 8.46126 10.7839 8.66398 10.786 9.00247C10.786 9.10179 10.8001 9.16055 10.8407 9.24166C10.9258 9.41799 11.0839 9.52339 11.5805 9.73823C12.4947 10.1315 12.8858 10.3909 13.1291 10.7598C13.4007 11.1713 13.4615 11.828 13.2771 12.3165C13.0744 12.8476 12.5717 13.2083 11.8643 13.328C11.6454 13.3665 11.1265 13.3604 10.8914 13.3178C10.3785 13.2266 9.89209 12.9733 9.59211 12.6408C9.47453 12.5111 9.24548 12.1726 9.25969 12.1483C9.26573 12.1402 9.31845 12.1078 9.37722 12.0733C9.43398 12.0409 9.64887 11.9172 9.85154 11.7996L10.2184 11.5868L10.2954 11.7003C10.4029 11.8645 10.638 12.0895 10.7799 12.1645C11.1873 12.3794 11.7467 12.3489 12.0224 12.1017C12.14 11.9942 12.1886 11.8827 12.1886 11.7186C12.1886 11.5706 12.1703 11.5057 12.0933 11.3943C11.994 11.2524 11.7913 11.1328 11.2157 10.8835C10.5569 10.5997 10.2731 10.4234 10.0137 10.1436C9.86371 9.9815 9.7218 9.72202 9.66304 9.50513C9.6144 9.32476 9.60223 8.87273 9.64074 8.69031C9.77652 8.05387 10.2569 7.60998 10.9501 7.47819C11.1752 7.43564 11.6981 7.45185 11.919 7.50657Z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    title: "Framer Motion",
    info: "A React animation library for smooth transitions",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.99996 8L2.66663 2.66666V13.3333L13.3333 2.66666V13.3333L10.6666 10.6667"
          stroke="black"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M13.3333 8L7.99992 13.3333L5.33325 10.6667"
          stroke="black"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
];

export default function Works18() {
  const [selectedTech, setSelectedTech] = useState<
    (typeof initialValues)[number]["title"]
  >(initialValues[0].title);

  const currentIndex = initialValues.findIndex(
    (value) => value.title === selectedTech
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <MotionConfig transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}>
        <div className="flex min-h-12 rounded-lg border bg-white px-4 py-4 shadow-sm">
          <IconWrapper selectedIndex={currentIndex} />
          <div className="flex flex-col gap-0.5">
            <TextWrapper selectedIndex={currentIndex} />
            <LabelWrapper selectedIndex={currentIndex} />
          </div>
        </div>
      </MotionConfig>

      <div className="mt-8 flex flex-col">
        {initialValues.map((item) => (
          <Button
            variant={"link"}
            key={item.title}
            size={"sm"}
            onClick={() => setSelectedTech(item.title)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <p className="line-clamp-1">
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Exercitationem
        dolores illum atque corrupti suscipit iste eveniet labore porro natus
        modi, nam perspiciatis expedita ducimus. Nemo maxime earum esse
        consectetur reprehenderit?
      </p>
    </div>
  );
}

function IconWrapper({ selectedIndex }: { selectedIndex: number }) {
  return (
    <div className="flex h-8 flex-col overflow-hidden">
      {initialValues.map((item) => (
        <motion.div
          key={item.title}
          animate={{
            y: `-${selectedIndex * 100}%`,
          }}
          className={cn(
            "flex h-8 shrink-0 cursor-pointer items-center rounded-md"
          )}
        >
          {item.icon}
        </motion.div>
      ))}
    </div>
  );
}

function TextWrapper({ selectedIndex }: { selectedIndex: number }) {
  return (
    <div className="flex h-6 flex-col overflow-hidden font-semibold">
      {initialValues.map((item) => (
        <motion.div
          key={item.title}
          animate={{
            y: `-${selectedIndex * 100}%`,
          }}
          className={cn(
            "flex h-6 shrink-0 cursor-pointer items-center rounded-md px-4"
          )}
        >
          {item.title}
        </motion.div>
      ))}
    </div>
  );
}

function LabelWrapper({ selectedIndex }: { selectedIndex: number }) {
  return (
    <div className="flex h-5 flex-col overflow-hidden text-sm">
      {initialValues.map((item) => (
        <motion.p
          key={item.title}
          animate={{
            y: `-${selectedIndex * 100}%`,
          }}
          className={cn(
            "line-clamp-1 h-5 shrink-0 cursor-pointer rounded-md px-4"
          )}
        >
          {item.info}
        </motion.p>
      ))}
    </div>
  );
}

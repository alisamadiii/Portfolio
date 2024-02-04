const FrequentlyAskedQuestions = [
  {
    id: 1,
    question: "What is website development?",
    answer:
      "Website development is the process of creating and @building @a @website from scratch or making modifications to an existing website. It involves various tasks such as web design, front-end and back-end coding, content creation, and website optimization.",
  },
  {
    id: 2,
    question: "Why do I need a website for my business?",
    answer:
      "A website is essential for businesses as it serves as a powerful online presence, enabling you to reach a wider audience and showcase your products or services 24/7. It helps establish credibility, enhances brand visibility, facilitates customer engagement, and can even generate leads and sales.",
  },
  {
    id: 3,
    question: "How much does it cost to create a website?",
    answer:
      "The cost of creating a website depends on various factors such as the complexity of the design, the number of pages, desired functionalities, and any additional services required. It's best to @contact @us directly with your specific requirements so that we can provide you with an accurate estimate.",
  },
  {
    id: 4,
    question: "How long does it take to build a website?",
    answer:
      "The timeframe for building a website depends on the scope and complexity of the project. A simple website can be developed within @a @few @weeks, while more complex websites may take several months. We work closely with our clients to establish realistic timelines and keep them updated throughout the process.",
  },
  {
    id: 12,
    question: "Which payment method do you use?",
    answer: `PayPal`,
  },
  {
    id: 13,
    question: "They are too expensive.",
    answer: "@Contact @Now! We can talk about it.",
  },
  {
    id: 5,
    question: "Can you help me with website design as well?",
    answer: "Yes",
  },
  {
    id: 6,
    question: "Do you offer responsive design for mobile devices?",
    answer: "Yes",
  },
  // {
  //   id: 7,
  //   question: "Will my website be compatible with different browsers?",
  //   answer: "writing",
  // },
  {
    id: 8,
    question: "Can you assist with domain registration and hosting setup?",
    answer: "Yes",
  },
  {
    id: 9,
    question:
      "Can you provide references or examples of websites you have developed?",
    answer: "You are seeing my portfolio right now :)",
  },
  {
    id: 10,
    question: "Can you redesign an existing website?",
    answer: "Yes",
  },
  {
    id: 11,
    question:
      "Will my website be customizable and easy to update in the future?",
    answer:
      "I am going to make a website in a way where you can update data very easy.",
  },
];

const Testimonials = [
  {
    id: 1,
    from: "Sharyph",
    headline: "Digital Creator",
    testimonial:
      "I have developed a full project with him, he is so far the best I have seen. He understands my requirements well, and executed really well. Also, he is not only good at coding, he understands UI, I like the design he came up. Keep it man",
  },
  {
    id: 2,
    from: "Muzzammil",
    headline: "AI Buff",
    testimonial:
      "I needed a site and contacted Ali, then had a call and the next day my site was full ready and was published. I was literally shocked and amazed by the speed and energy of Ali. If you are in need of a site development, Ali is your man",
  },
  {
    id: 3,
    from: "Avie Fukai",
    headline: "Bridge Software Engineer",
    testimonial:
      "Ali astoundingly completed the fundamental aspects of the website in a mere day, demonstrating exceptional speed and accuracy tailored to our specific requirements. His self-directed approach eliminated the need for detailed instructions or oversight, proving his remarkable independence and expertise. The site's performance and speed are excellent, and the design deserves high praise. Ali's work is a testament to his phenomenal skills and commitment.",
  },
];

export type TechsTypes = "html" | "css" | "js";

export interface TechsDataType {
  name: string;
  link: string;
  tech: TechsTypes;
}

const html: TechsDataType[] = [
  {
    name: "Semantic HTML",
    link: "https://x.com/alirdev/status/1712030418755817974?s=20",
    tech: "html",
  },
];

const css: TechsDataType[] = [
  {
    name: "4 ways of centering a div",
    link: "https://x.com/alirdev/status/1691736648227475698?s=20",
    tech: "css",
  },
  {
    name: "vh vs dvh",
    link: "https://x.com/alirdev/status/1751970485146181791?s=20",
    tech: "css",
  },
  {
    name: "Different way of writing CSS",
    link: "https://x.com/alirdev/status/1719645545613197765?s=20",
    tech: "css",
  },
  {
    name: "Box Model - CSS",
    link: "https://x.com/alirdev/status/1718915803951902921?s=20",
    tech: "css",
  },
  {
    name: "Display vs. Visibility - CSS",
    link: "https://x.com/alirdev/status/1717103867387904197?s=20",
    tech: "css",
  },
  {
    name: "Text Truncate",
    link: "https://x.com/alirdev/status/1737659640023003371?s=20",
    tech: "css",
  },
  {
    name: "How to make a gradient border?",
    link: "https://x.com/alirdev/status/1744539508543238363?s=20",
    tech: "css",
  },
  {
    name: "::before & ::after",
    link: "https://x.com/alirdev/status/1738706642848624757?s=20",
    tech: "css",
  },
  {
    name: "Box Model",
    link: "https://x.com/alirdev/status/1718915803951902921?s=20",
    tech: "css",
  },
  {
    name: "Aspect Ratio",
    link: "https://x.com/alirdev/status/1731601500307440039?s=20",
    tech: "css",
  },
  {
    name: "list-style-type",
    link: "https://x.com/alirdev/status/1729788777864864125?s=20",
    tech: "css",
  },
  {
    name: "Counters",
    link: "https://x.com/alirdev/status/1729064061202297315?s=20",
    tech: "css",
  },
  {
    name: "Combinator",
    link: "https://x.com/alirdev/status/1726527112176345444?s=20",
    tech: "css",
  },
  {
    name: "-webkit-tap-highlight-color: Optimizing Mobile UI Interactions",
    link: "https://x.com/alirdev/status/1722177320675615140?s=20",
    tech: "css",
  },
  {
    name: "Different way of writing CSS",
    link: "https://x.com/alirdev/status/1719645545613197765?s=20",
    tech: "css",
  },
  {
    name: "Display",
    link: "https://x.com/alirdev/status/1716381225123033090?s=20",
    tech: "css",
  },
  {
    name: "Overflow",
    link: "https://x.com/alirdev/status/1715292029163536634?s=20",
    tech: "css",
  },
  {
    name: "z-index",
    link: "https://x.com/alirdev/status/1714567264719224939?s=20",
    tech: "css",
  },
  {
    name: "position",
    link: "https://x.com/alirdev/status/1713845222759977004?s=20",
    tech: "css",
  },
  {
    name: "Smooth Scrolling",
    link: "https://x.com/alirdev/status/1711305679712190511?s=20",
    tech: "css",
  },
  {
    name: "Scroll Padding",
    link: "https://x.com/alirdev/status/1710231381417353440?s=20",
    tech: "css",
  },
  {
    name: "Input Placeholder",
    link: "https://x.com/alirdev/status/1709493713238708312?s=20",
    tech: "css",
  },
  {
    name: "Global Variables",
    link: "https://x.com/alirdev/status/1708768934114300405?s=20",
    tech: "css",
  },
  {
    name: "How to fade out content in CSS?",
    link: "https://x.com/alirdev/status/1706232236822167659?s=20",
    tech: "css",
  },
  {
    name: "Working with SVG color",
    link: "https://x.com/alirdev/status/1706957002013069415?s=20",
    tech: "css",
  },
  {
    name: "Learn how to create a custom scrollbar",
    link: "https://x.com/alirdev/status/1696810084561752570?s=20",
    tech: "css",
  },
  {
    name: "Grid",
    link: "https://x.com/alirdev/status/1704427958885294410?s=20",
    tech: "css",
  },
  {
    name: "Understand the benefits of using max-width",
    link: "https://x.com/alirdev/status/1703695456814199268?s=20",
    tech: "css",
  },
  {
    name: "Understand the benefits of using max-width",
    link: "https://x.com/alirdev/status/1703695456814199268?s=20",
    tech: "css",
  },
  {
    name: "Background Gradient",
    link: "https://x.com/alirdev/status/1701883522850656678?s=20",
    tech: "css",
  },
  {
    name: "::first-letter",
    link: "https://x.com/alirdev/status/1700097550748111004?s=20",
    tech: "css",
  },
  {
    name: "calc() - CSS Function",
    link: "https://x.com/alirdev/status/1699346801609023528?s=20",
    tech: "css",
  },
  {
    name: "Media Queries",
    link: "https://x.com/alirdev/status/1697534936377614667?s=20",
    tech: "css",
  },
  {
    name: "Padding & Margin",
    link: "https://x.com/alirdev/status/1696085313855373571?s=20",
    tech: "css",
  },
  {
    name: "Transform",
    link: "https://x.com/alirdev/status/1694635830416175413?s=20",
    tech: "css",
  },
  {
    name: "Object Fit",
    link: "https://x.com/alirdev/status/1692461481013710995?s=20",
    tech: "css",
  },
  {
    name: "Create an iOS Toggle Switch with HTML & CSS - Here's How!",
    link: "https://x.com/alirdev/status/1693911015468175582?s=20",
    tech: "css",
  },
  {
    name: "Flex Order",
    link: "https://x.com/alirdev/status/1693186197680742548?s=20",
    tech: "css",
  },
  {
    name: "Flex Position",
    link: "https://x.com/alirdev/status/1690649487059152897?s=20",
    tech: "css",
  },
];

const js: TechsDataType[] = [
  {
    name: "Different Ways of Writing Function",
    link: "https://x.com/alirdev/status/1721452535003938909?s=20",
    tech: "js",
  },
  {
    name: "Slice vs Splice",
    link: "https://x.com/alirdev/status/1725440019513667962?s=20",
    tech: "js",
  },
  {
    name: "Math",
    link: "https://x.com/alirdev/status/1727253424268562601?s=20",
    tech: "js",
  },
  {
    name: "Let vs Const",
    link: "https://x.com/alirdev/status/1724713993582084514?s=20",
    tech: "js",
  },
  {
    name: "if statement vs switch statement",
    link: "https://x.com/alirdev/status/1723989230257660109?s=20",
    tech: "js",
  },
  {
    name: "map arrays",
    link: "https://x.com/alirdev/status/1722902068716007476?s=20",
    tech: "js",
  },
  {
    name: "Different Ways of Writing Function",
    link: "https://x.com/alirdev/status/1721452535003938909?s=20",
    tech: "js",
  },
  {
    name: "Array Methods",
    link: "https://x.com/alirdev/status/1701158723996319851?s=20",
    tech: "js",
  },
];

const techsData: TechsDataType[] = [...html, ...css, ...js];

export { FrequentlyAskedQuestions, Testimonials, techsData };

import React from "react";
import { FaEarthAmericas, FaReact } from "react-icons/fa6";
import { BsVectorPen } from "react-icons/bs";
import { TechnologyType } from "@/types/index.t";

const ServiceINITIAL_VALUE = [
  {
    id: 1,
    title: "Building Website",
    description: "Crafting captivating, functional websites.",
    icon: React.createElement(FaEarthAmericas),
  },
];

const Projects = [
  {
    id: 1,
    name: "AniLearn.dev",
    description:
      "We offer top-notch content for easy learning, with clear visual development principles.",
    site: "https://www.anilearn.dev/",
  },
];

const Experience = [
  {
    id: 1,
    title: "Content Creations",
    subtitle: "X",
    description:
      "I began creating animated content in January 2023, and within one month, I gained 10k followers. My content has been well-received by many people, and I continue to improve it every day.",
    date: "2020",
    icon: React.createElement(FaEarthAmericas),
  },
  {
    id: 2,
    title: "Front-End Developer",
    subtitle: "HTML, CSS & JS",
    description:
      "Like everyone else, I began my journey by learning HTML and CSS. I completed numerous projects using these technologies. Once I felt comfortable with HTML and CSS, I decided to delve into JavaScript. At first, I questioned the purpose of learning JavaScript, but eventually, I discovered its significance.",
    date: "2020 - 2022",
    icon: React.createElement(BsVectorPen),
  },
  {
    id: 3,
    title: "Front-End Developer",
    subtitle: "Figma, Next.js & Framer Motion",
    description:
      "If I want to undertake a massive project, I need to use technologies that will assist me in its development. That's why I decided to learn CSS framework (Tailwindcss) and JavaScript library (Reactjs). I dedicate most of my time to building projects and contributing to open source, as I recognize that these are the most effective ways to improve oneself - by actively creating and collaborating on other people's projects. Additionally, I've started working with Figma because I understand that if I want to work independently or start my own company, having knowledge of UI is crucial. Thankfully, everything is going well so far. Occasionally, I may become frustrated when encountering a bug that takes time to solve, but I am confident that I will find a solution soon.",
    date: "2022 - present",
    icon: React.createElement(FaReact),
  },
];

const Technologies: TechnologyType[] = [
  {
    id: 1,
    title: "HTML",
    icon: "html",
    description:
      "The HyperText Markup Language or HTML is the standard markup language for documents designed to be displayed in a web browser.",
  },
  {
    id: 2,
    title: "CSS",
    icon: "css",
    description:
      "Cascading Style Sheets (CSS) is a style sheet language used for describing the presentation of a document written in a markup language such as HTML or XML. CSS is a cornerstone technology of the World Wide Web, alongside HTML and JavaScript. ",
  },
  {
    id: 3,
    title: "JavaScript",
    icon: "js",
    description:
      "JavaScript (JS) is a computer programming language used to make websites and applications dynamic and interactive.",
  },
  {
    id: 4,
    title: "Tailwind CSS",
    icon: "tailwind",
    description:
      "A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.",
  },
  {
    id: 5,
    title: "React.js",
    icon: "reactjs",
    description:
      "React lets you build user interfaces out of individual pieces called components. Create your own React components like Thumbnail, LikeButton, and Video. Then combine them into entire screens, pages, and apps.",
  },
  {
    id: 6,
    title: "Next.js",
    icon: "nextjs",
    description:
      "Used by some of the world's largest companies, Next.js enables you to create full-stack Web applications by extending the latest React features, and integrating powerful Rust-based JavaScript tooling for the fastest builds.",
  },
  {
    id: 7,
    title: "Supabase",
    icon: "supabase",
    description: "Supabase is an open source Firebase alternative.",
  },
];

export type PricingType = {
  id: number;
  title: string;
  price: number;
  job: {
    design: boolean;
    coding: boolean;
    animation: boolean;
  };
};

const Pricing: PricingType[] = [
  {
    id: 1,
    title: "level 1",
    price: 30,
    job: {
      design: false,
      coding: true,
      animation: false,
    },
  },
  {
    id: 2,
    title: "level 2",
    price: 60,
    job: {
      design: true,
      coding: true,
      animation: false,
    },
  },
  {
    id: 3,
    title: "level 3",
    price: 70,
    job: {
      design: false,
      coding: true,
      animation: true,
    },
  },
  {
    id: 4,
    title: "level 4",
    price: 120,
    job: {
      design: true,
      coding: true,
      animation: true,
    },
  },
];

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

export {
  ServiceINITIAL_VALUE,
  Projects,
  Experience,
  Technologies,
  Pricing,
  FrequentlyAskedQuestions,
  Testimonials,
};

export type FRONT_END_SERVICES = {
  level: number;
  job: ("design" | "coding" | "animation" | "everything")[];
  description: string;
  price: number;
  design: boolean;
  coding: boolean;
  animation: boolean;
}[];

export type FRONT_END_SERVICE = {
  level: number;
  job: ("design" | "coding" | "animation" | "everything")[];
  description: string;
  price: number;
  design: boolean;
  coding: boolean;
  animation: boolean;
};

export const Front_End_Services: FRONT_END_SERVICES = [
  {
    level: 1,
    job: ["design", "coding"],
    description: "I will design and code the website for you.",
    price: 60,
    design: true,
    coding: true,
    animation: false,
  },
  {
    level: 2,
    job: ["coding"],
    description: "You will give a design and I will code it.",
    price: 30,
    design: false,
    coding: true,
    animation: false,
  },
  {
    level: 3,
    job: ["coding", "animation"],
    description: "You will give a design and I will code it.",
    price: 70,
    design: false,
    coding: true,
    animation: true,
  },
  {
    level: 4,
    job: ["everything"],
    description: "You will give a design and I will code it.",
    price: 120,
    design: true,
    coding: true,
    animation: true,
  },
];

export type TESTIMONIAL_SERVICES = {
  id: number;
  name: string;
  headline: string;
  star: number;
  client_image: string;
  message: string;
  project_review: {
    id: number;
    image: string;
    pageName: string;
    note: null | string;
  }[];
}[];

export type TESTIMONIAL_SERVICE = {
  id: number;
  name: string;
  headline: string;
  star: number;
  client_image: string;
  message: string;
  project_review: {
    id: number;
    image: string;
    pageName: string;
    note: null | string;
  }[];
};

export const Testimonial_Service: TESTIMONIAL_SERVICES = [
  {
    id: 1,
    name: "Sharyph",
    headline: "Digital Creator",
    star: 5,
    client_image:
      "https://pbs.twimg.com/profile_images/1537816050548736003/ITkOCqnX_400x400.jpg",
    message:
      "I have developed a full project with him, he is so far the best I have seen. He understands my requirements well, and executed really well. Also, he is not only good at coding, he understands UI, I like the design he came up. Keep it man",
    project_review: [
      {
        id: 1,
        image: "/Client/Sharyph - image 1.png",
        pageName: "Home Page",
        note: "This is the homepage of the website.",
      },
      {
        id: 2,
        image: "/Client/Sharyph - image 2.png",
        pageName: "Tools",
        note: null,
      },
      {
        id: 3,
        image: "/Client/Sharyph - image 3.png",
        pageName: "Each Tools",
        note: null,
      },
    ],
  },
  {
    id: 2,
    name: "Muzzammil",
    headline: "AI Buff",
    star: 5,
    client_image:
      "https://pbs.twimg.com/profile_images/1661986917871919104/6Rn00NvG_400x400.jpg",
    message:
      "I needed a site and contacted Ali, then had a call and the next day my site was full ready and was published. I was literally shocked and amazed by the speed and energy of Ali. If you are in need of a site development, Ali is your man",
    project_review: [
      {
        id: 1,
        image: "/Client/Muzzammil - image 1.png",
        pageName: "Home Page",
        note: "This is the homepage of the website.",
      },
      {
        id: 2,
        image: "/Client/Muzzammil - image 2.png",
        pageName: "Sponsored Post Offers",
        note: null,
      },
    ],
  },
  {
    id: 3,
    name: "Avie Fukai",
    headline: "Bridge Software Engineer",
    star: 5,
    client_image:
      "https://pbs.twimg.com/profile_images/1592898593324937217/X1mJmFDY_400x400.jpg",
    message:
      "Ali astoundingly completed the fundamental aspects of the website in a mere day, demonstrating exceptional speed and accuracy tailored to our specific requirements. His self-directed approach eliminated the need for detailed instructions or oversight, proving his remarkable independence and expertise. The site's performance and speed are excellent, and the design deserves high praise. Ali's work is a testament to his phenomenal skills and commitment.",
    project_review: [
      {
        id: 1,
        image: "/Client/Avie - image 1.png",
        pageName: "Home Page",
        note: "This is the homepage of the website.",
      },
      {
        id: 2,
        image: "/Client/Avie - image 2.png",
        pageName: "Profile",
        note: "We can change theme and set our profile to be private or public",
      },
      {
        id: 3,
        image: "/Client/Avie - image 3.png",
        pageName: "Adding Goals",
        note: null,
      },
      {
        id: 4,
        image: "/Client/Avie - image 4.png",
        pageName: "Seeing our Goals",
        note: null,
      },
    ],
  },
];

export type FAQs = {
  id: number;
  question: string;
  answer: string;
}[];

export type FAQ = {
  id: number;
  question: string;
  answer: string;
};

export const Faq: FAQs = [
  {
    id: 1,
    question: "What is website development?",
    answer:
      "<p class='mt-4 opacity-80 mb-2'>Website development is the process of creating and building a website from scratch or making modifications to an existing website. It involves various tasks such as web design, front-end and back-end coding, content creation, and website optimization.</p>",
  },
  {
    id: 2,
    question: "Why do I need a website for my business?",
    answer:
      "<p class='mt-4 opacity-80 mb-2'>A website is essential for businesses as it serves as a powerful online presence, enabling you to reach a wider audience and showcase your products or services 24/7. It helps establish credibility, enhances brand visibility, facilitates customer engagement, and can even generate leads and sales.</p>",
  },
  {
    id: 3,
    question: "How much does it cost to create a website?",
    answer:
      "<p class='mt-4 opacity-80 mb-2'>The <a href='#cost' class='text-white underline hover:no-underline'>cost</a> of creating a website depends on various factors such as the complexity of the design, the number of pages, desired functionalities, and any additional services required. It's best to contact us directly with your specific requirements so that we can provide you with an accurate estimate.</p>",
  },
  {
    id: 4,
    question: "How long does it take to build a website?",
    answer:
      "<p class='mt-4 opacity-80 mb-2'>The timeframe for building a website depends on the scope and complexity of the project. A simple website can be developed within a few weeks, while more complex websites may take several months. We work closely with our clients to establish realistic timelines and keep them updated throughout the process.</p>",
  },
  {
    id: 12,
    question: "Which payment method do you use?",
    answer: `<!-- PayPal Logo --><table border="0" cellpadding="6"><tr><td align="center"></td></tr><tr><td align="center"><a href="https://www.paypal.com/c2/webapps/mpp/home?locale.x=en_C2" title="PayPal" onclick="javascript:window.open('https://www.paypal.com/c2/webapps/mpp/home?locale.x=en_C2','WIPaypal','toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=1060, height=700'); return false;"><img src="https://www.paypalobjects.com/digitalassets/c/website/marketing/apac/C2/logos-buttons/optimize/26_Grey_PayPal_Pill_Button.png" alt="PayPal" /></a></td></tr></table><!-- PayPal Logo -->`,
  },
  {
    id: 13,
    question: "They are too expensive.",
    answer:
      "<p class='mt-4 opacity-80 mb-2 flex items-center gap-1'><img class='w-8' src='https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2044px-WhatsApp.svg.png' /><a href='https://wa.me/message/MNYH64MBHSXKN1' target='_blank' class='text-white underline hover:no-underline'>Contact Now!</a> We can talk about it.</p>",
  },
  {
    id: 5,
    question: "Can you help me with website design as well?",
    answer: "writing",
  },
  {
    id: 6,
    question: "Do you offer responsive design for mobile devices?",
    answer: "writing",
  },
  {
    id: 7,
    question: "Will my website be compatible with different browsers?",
    answer: "writing",
  },
  {
    id: 8,
    question: "Can you assist with domain registration and hosting setup?",
    answer: "writing",
  },
  {
    id: 9,
    question:
      "Can you provide references or examples of websites you have developed?",
    answer: "writing",
  },
  {
    id: 10,
    question: "Can you redesign an existing website?",
    answer: "writing",
  },
  {
    id: 11,
    question:
      "Will my website be customizable and easy to update in the future?",
    answer: "writing",
  },
];

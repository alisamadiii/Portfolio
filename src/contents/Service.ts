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

export type DAILY_APPLICATIONS_Type = {
  app: number;
  name: string;
  img: string;
  useCase: string[];
}[];

export type DAILY_APPLICATION_Type = {
  app: number;
  name: string;
  img: string;
  useCase: string[];
};

export const DAILY_APPLICATIONS: DAILY_APPLICATIONS_Type = [
  {
    app: 1,
    name: "Chrome",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/800px-Google_Chrome_icon_%28February_2022%29.svg.png",
    useCase: ["Studing", "Developing"],
  },
  {
    app: 2,
    name: "VS Code",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png",
    useCase: ["Writing Codes"],
  },
  {
    app: 3,
    name: "Notion",
    img: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    useCase: ["Keeping track of my Goals", "Making Template"],
  },
  {
    app: 4,
    name: "Figma",
    img: "https://miro.medium.com/v2/resize:fit:320/1*j3GPPrDmy2CqnxPw-NtWHg.png",
    useCase: ["Making Wireframes", "Designing Website + Images"],
  },
  {
    app: 5,
    name: "Twitter",
    img: "https://assets.stickpng.com/images/580b57fcd9996e24bc43c53e.png",
    useCase: ["Sharing my Journey", "Sharing Animated Contents"],
  },
  {
    app: 6,
    name: "PowerPoint",
    img: "https://1000logos.net/wp-content/uploads/2020/08/Microsoft-PowerPoint-Logo.png",
    useCase: ["Making Animated Contents"],
  },
  {
    app: 7,
    name: "Word",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg/1101px-Microsoft_Office_Word_%282019%E2%80%93present%29.svg.png",
    useCase: ["Designing Book"],
  },
  {
    app: 8,
    name: "Postman",
    img: "https://cdn.worldvectorlogo.com/logos/postman.svg",
    useCase: ["Testing API Calls"],
  },
  {
    app: 9,
    name: "Discord",
    img: "https://www.freepnglogos.com/uploads/discord-logo-png/discord-logo-logodownload-download-logotipos-1.png",
    useCase: ["Engaging with Developers", "Staff Member"],
  },
  {
    app: 10,
    name: "CapCut",
    img: "https://freelogopng.com/images/all_img/1664284918capcut-icon-png.png",
    useCase: ["Making Simple Videos"],
  },
  {
    app: 11,
    name: "YouTube",
    img: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png",
    useCase: ["Walking Series", "Tutorials & Speechs"],
  },
  {
    app: 12,
    name: "GitHub",
    img: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
    useCase: ["Collabration", "Storing my Codes"],
  },
];

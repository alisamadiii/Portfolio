type IProjectsTypes = {
  project: number;
  name: string;
  description: string;
  banner: string;
  started_at: string;
  github: string;
  website: string;
}[];

export const PROJECTS: IProjectsTypes = [
  {
    project: 1,
    name: "AniLearn.dev",
    description:
      "We provide the best content to learn something very easily. The visual descriptions of development principles that We create are very clear.",
    banner: "https://i.ibb.co/Jt33tGq/Mac-Book-Pro-14-1.png",
    started_at: "2023/11/02",
    github: "https://github.com/AliReza1083/AniLearn.dev",
    website: "https://www.anilearn.dev/",
  },
  {
    project: 2,
    name: "Grammar AI",
    description:
      "This application makes it easy for users to improve their writing and avoid common mistakes.",
    banner: "https://i.ibb.co/n79vrKr/Documentation.png",
    started_at: "2023/02/03",
    github: "https://github.com/AliReza1083/grammar-ai",
    website: "https://grammar-ai.vercel.app/",
  },
  {
    project: 3,
    name: "Asakatsu",
    description:
      "A project where you can keep track of your goal's progress, and contribute to open source in the same time.",
    banner: "https://i.ibb.co/kgCFZXk/Pricing.png   ",
    started_at: "2022/17/10",
    github: "https://github.com/asakatsuOrg/Asakatsu-Website",
    website: "https://asakatsu-website.netlify.app/",
  },
];

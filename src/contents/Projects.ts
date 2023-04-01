type ProjectsType = {
  id: number;
  name: string;
  description: string;
  website: string;
  github: string;
  product_hunt: null | string;
  twitter: null | string;
}[];

export const PROJECTS: ProjectsType = [
  {
    id: 1,
    name: "AniLearn.dev",
    description:
      "We provide the best content to learn something very easily. The visual descriptions of development principles that We create are very clear.",
    website: "https://www.anilearn.dev/",
    github: "https://github.com/AliReza1083/AniLearn.dev",
    product_hunt: null,
    twitter: null,
  },
];

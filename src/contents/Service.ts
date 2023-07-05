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

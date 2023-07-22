export type PackagesType = {
  id: number;
  name: string;
  description: string;
  price: number;
  example_URL: string | null;
}[];

export const Packages: PackagesType = [
  {
    id: 1,
    name: "tweet",
    description:
      "Lorem ipsum dolor sit amet consectetur. Et sapien purus nisl maecenas senectus pulvinar enim tellus integer. Pellentesque convallis vel proin felis scelerisque ",
    price: 100,
    example_URL: null,
  },
  {
    id: 2,
    name: "thread",
    description:
      "Lorem ipsum dolor sit amet consectetur. Et sapien purus nisl maecenas senectus pulvinar enim tellus integer. Pellentesque convallis vel proin felis scelerisque ",
    price: 300,
    example_URL: null,
  },
  {
    id: 3,
    name: "listicle",
    description:
      "Lorem ipsum dolor sit amet consectetur. Et sapien purus nisl maecenas senectus pulvinar enim tellus integer. Pellentesque convallis vel proin felis scelerisque ",
    price: 250,
    example_URL: null,
  },
];

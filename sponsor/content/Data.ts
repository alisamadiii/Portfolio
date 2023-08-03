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
    description: "",
    price: 100,
    example_URL: null,
  },
  {
    id: 2,
    name: "thread",
    description: "",
    price: 300,
    example_URL:
      "https://twitter.com/Ali_Developer05/status/1680144107455528960?s=20",
  },
  {
    id: 3,
    name: "listicle",
    description: "",
    price: 250,
    example_URL:
      "https://twitter.com/Ali_Developer05/status/1680500980389912578?s=20",
  },
];

type ProductsType = {
  product: number;
  name: string;
  description: string;
  tags: string[];
  image: string;
  price: number | "FREE";
  link: string;
  discount: null | number;
  discountData: null | string;
  rate: number;
  valuable: boolean;
}[];

export type ProductType = {
  product: number;
  name: string;
  description: string;
  tags: string[];
  image: string;
  price: number | "FREE";
  link: string;
  discount: null | number;
  discountData: null | string;
  rate: number;
  valuable: boolean;
};

export const PRODUCTS: ProductsType = [
  {
    product: 1,
    name: "How to Make Animated Content: A Beginner's Guide",
    description:
      "This will help you to make animated contents for your social medias with PowerPoint.",
    tags: ["animated", "content"],
    image: "https://public-files.gumroad.com/f6f9ir9pcog81pzburhbmyh9yfky",
    price: "FREE",
    link: "https://alireza05.gumroad.com/l/how-to-make-animated-content",
    discount: null,
    discountData: null,
    rate: 5,
    valuable: true,
  },
  {
    product: 2,
    name: "Flexbox Mastery: Build Modern and Responsive Layouts with CSS Flexbox",
    description:
      "In this package, you'll learn everything you need to know about Flexbox, from the basics to advanced techniques.",
    tags: ["animated", "content"],
    image: "https://public-files.gumroad.com/bxn4mr5g4mub3qw9w4fpr30olc7s",
    price: "FREE",
    link: "https://alireza05.gumroad.com/l/flex-box",
    discount: null,
    discountData: null,
    rate: 0,
    valuable: false,
  },
  {
    product: 3,
    name: "Plan and then Make",
    description:
      "The best place where you can write your tasks/bugs and start coding it with your teams",
    tags: ["animated", "content"],
    image: "https://public-files.gumroad.com/aiyf5z39rdlspqc5bq8ao1ej41wt",
    price: 5,
    link: "https://alireza05.gumroad.com/l/plan-and-then-make",
    discount: null,
    discountData: null,
    rate: 0,
    valuable: false,
  },
];

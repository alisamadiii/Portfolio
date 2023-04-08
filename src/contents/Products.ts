type ProductsType = {
  product: number;
  name: string;
  description: string;
  tags: string[];
  image: string;
  price: number | "FREE";
  discount: null | number;
  discountData: null | string;
}[];

export type ProductType = {
  product: number;
  name: string;
  description: string;
  tags: string[];
  image: string;
  price: number | "FREE";
  discount: null | number;
  discountData: null | string;
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
    discount: null,
    discountData: null,
  },
];

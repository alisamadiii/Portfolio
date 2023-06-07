export type AnilearnTestimonialTypes = {
  id: number;
  name: string;
  headline: string | null;
  message: string;
  twitter: string;
  image: string;
}[];

export type EachTestimonialTypes = {
  id: number;
  name: string;
  headline: string | null;
  message: string;
  twitter: string;
  image: string;
};

export const ANILEARN_TESTIMONIAL: AnilearnTestimonialTypes = [
  {
    id: 1,
    name: "Csaba Kissi",
    headline: "Solopreneur",
    message:
      "I like these animated posts by Ali. They are educational and look great at the same time.",
    twitter: "https://twitter.com/csaba_kissi",
    image:
      "https://pbs.twimg.com/profile_images/1454861068233228289/6sn9BYOf_400x400.jpg",
  },
  {
    id: 2,
    name: "Swapna Kumar Panda",
    headline: "Tech Writer",
    message: "Your animated tutorials are top-notch.",
    twitter: "https://twitter.com/swapnakpanda",
    image:
      "https://pbs.twimg.com/profile_images/1621910730227449856/iW8AGVCr_400x400.jpg",
  },
  {
    id: 3,
    name: "GrahamTheDev",
    headline: "DevRel",
    message:
      "Ali is helpful, friendly and contributes a lot to the community.The visual descriptions of development principles that Ali creates are top tier and very clear. I hope this content continues and evolves for some time as it is nice to see original ideas that make learning more straight forward for everyone.",
    twitter: "https://twitter.com/GrahamTheDev",
    image:
      "https://pbs.twimg.com/profile_images/1643171320190980096/tXJgdOcP_400x400.jpg",
  },
  {
    id: 4,
    name: "Savio Martin",
    headline: null,
    message:
      "I love what you're doing, the animations are top notch. I'll also ask you to think abt YouTube, you can create YouTube shorts and make a living. Anyways all i got to say it, keep rocking and keep husling!",
    twitter: "https://twitter.com/saviomartin7",
    image:
      "https://pbs.twimg.com/profile_images/1617899739172995072/qF-3t5w8_400x400.jpg",
  },
  {
    id: 5,
    name: "Madza",
    headline: "Tech Writer and Frontend Developer",
    message:
      "Love the animated and unique content by Ali! Tech concepts are often best explained visually and he does amazing job with it!",
    twitter: "https://twitter.com/madzadev",
    image:
      "https://pbs.twimg.com/profile_images/1526471322762715136/w25QtNnl_400x400.jpg",
  },
  {
    id: 6,
    name: "Avie",
    headline: "Bridge Systems Engineer/Community Manager",
    message:
      "I love Ali's animated content on Twitter. He post a tutorial everyday and it helps a lot of people because it's easy to follow and understand.",
    twitter: "https://twitter.com/AvieDev",
    image:
      "https://pbs.twimg.com/profile_images/1592898593324937217/X1mJmFDY_400x400.jpg",
  },
];

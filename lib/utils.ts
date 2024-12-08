import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const showcaseImage =
  "https://images.unsplash.com/photo-1515266591878-f93e32bc5937?q=80&w=2592&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
export const showcaseImage2 =
  "https://images.unsplash.com/photo-1612714154350-80450de823e8?q=80&w=1829&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export const files = {
  image: {
    1: "https://utfs.io/f/bTa5OaPXXZ6rlQlFl7aFatPcj5SGOUmnvzAsZWHDNKkbMqX9",
    2: "https://utfs.io/f/bTa5OaPXXZ6reklU4xdQorh5JmOQZ92LR6AFwHXy3liYjGPs",
    3: "https://utfs.io/f/bTa5OaPXXZ6rGHhDRAkNzR7Ye9xSJuaHPndtoDX0Q8TBlU3c",
    4: "https://utfs.io/f/bTa5OaPXXZ6re3beIAQorh5JmOQZ92LR6AFwHXy3liYjGPsv",
    5: "https://utfs.io/f/bTa5OaPXXZ6rrZwHUmhT7jwHVkB4xt6K9bNOfucCGZendEqS",
    6: "https://utfs.io/f/bTa5OaPXXZ6rzBgvg9S0TjQSmocqUltP7HB2GOVC3vW8xLEr",
    // 16/9
    7: "https://utfs.io/f/bTa5OaPXXZ6rP4xIwGO50MtkbV1F73hdQ4gqxsDOuywYeUA8",
    gladiator:
      "https://utfs.io/f/bTa5OaPXXZ6rdD0EDo7iwGBIholDNRf1yT62APcsvrUKML8S",
  },
  video: {
    1: "https://utfs.io/f/bTa5OaPXXZ6rXyXvdMAcqyLVgEBIzP6St18lu72QJabsMUxG",
  },
  poster: {
    1: "https://utfs.io/f/bTa5OaPXXZ6ruCmJRNrWLOa5DSFB2dW6KsUVlkNQpozXA19n",
  },
};

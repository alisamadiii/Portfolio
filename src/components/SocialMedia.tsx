import React from "react";
import Image from "next/image";

import * as Dialog from "./Dialog";
import * as TopMenuBar from "./TopMenuBar";
import { cn } from "@/utils";

const twitter = [
  {
    id: 1,
    name: "Ali Reza",
    username: "@alirdev",
    img: "https://pbs.twimg.com/profile_images/1774123575248830466/e0rbeSop_400x400.jpg",
    link: "https://twitter.com/alirdev",
    description: "This account is only for sharing HTML, and CSS contents.",
  },
  {
    id: 2,
    name: "Ali Samadi",
    username: "@alisamadi__",
    img: "https://pbs.twimg.com/profile_images/1796933077891231745/SQCEp_jD_400x400.jpg",
    link: "https://x.com/alisamadi__",
    description:
      "I share my work here and that I started this account on April/2024 and thanks god it is growing fast.",
  },
];

export default function SocialMedia({ animation }: { animation: boolean }) {
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2",
          animation && "animate-blur opacity-0 blur-sm"
        )}
        style={{ animationDelay: ".3s" }}
      >
        <Dialog.Wrapper>
          <Dialog.Button id="twitter">
            <svg
              width="24"
              height="25"
              viewBox="0 0 24 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.0981 4.83331H19.8167L13.8772 11.6223L20.8649 20.8587H15.3939L11.1092 15.2562L6.20544 20.8587H3.48542L9.83855 13.5969L3.13525 4.83405H8.74522L12.6184 9.95498L17.0981 4.83331ZM16.1444 19.232H17.6507L7.9267 6.37506H6.31035L16.1444 19.232Z"
                fill="currentColor"
              />
            </svg>
          </Dialog.Button>
        </Dialog.Wrapper>
        <a href="https://www.linkedin.com/in/alireza17/" target="_blank">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 3C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19ZM18.5 18.5V13.2C18.5 12.3354 18.1565 11.5062 17.5452 10.8948C16.9338 10.2835 16.1046 9.94 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17C14.6813 12.17 15.0374 12.3175 15.2999 12.5801C15.5625 12.8426 15.71 13.1987 15.71 13.57V18.5H18.5ZM6.88 8.56C7.32556 8.56 7.75288 8.383 8.06794 8.06794C8.383 7.75288 8.56 7.32556 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19C6.43178 5.19 6.00193 5.36805 5.68499 5.68499C5.36805 6.00193 5.19 6.43178 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56ZM8.27 18.5V10.13H5.5V18.5H8.27Z"
              fill="currentColor"
            />
          </svg>
        </a>

        <a
          href="https://github.com/AliReza1083/"
          target="_blank"
          className="-translate-y-px"
        >
          <svg
            width="24"
            height="25"
            viewBox="0 0 24 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2.84601C10.6868 2.84601 9.38642 3.10467 8.17317 3.60721C6.95991 4.10976 5.85752 4.84635 4.92893 5.77494C3.05357 7.6503 2 10.1938 2 12.846C2 17.266 4.87 21.016 8.84 22.346C9.34 22.426 9.5 22.116 9.5 21.846V20.156C6.73 20.756 6.14 18.816 6.14 18.816C5.68 17.656 5.03 17.346 5.03 17.346C4.12 16.726 5.1 16.746 5.1 16.746C6.1 16.816 6.63 17.776 6.63 17.776C7.5 19.296 8.97 18.846 9.54 18.606C9.63 17.956 9.89 17.516 10.17 17.266C7.95 17.016 5.62 16.156 5.62 12.346C5.62 11.236 6 10.346 6.65 9.63601C6.55 9.38601 6.2 8.34601 6.75 6.99601C6.75 6.99601 7.59 6.72601 9.5 8.01601C10.29 7.79601 11.15 7.68601 12 7.68601C12.85 7.68601 13.71 7.79601 14.5 8.01601C16.41 6.72601 17.25 6.99601 17.25 6.99601C17.8 8.34601 17.45 9.38601 17.35 9.63601C18 10.346 18.38 11.236 18.38 12.346C18.38 16.166 16.04 17.006 13.81 17.256C14.17 17.566 14.5 18.176 14.5 19.106V21.846C14.5 22.116 14.66 22.436 15.17 22.346C19.14 21.006 22 17.266 22 12.846C22 11.5328 21.7413 10.2324 21.2388 9.01917C20.7362 7.80592 19.9997 6.70353 19.0711 5.77494C18.1425 4.84635 17.0401 4.10976 15.8268 3.60721C14.6136 3.10467 13.3132 2.84601 12 2.84601Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </div>

      <Dialog.Dialog id="twitter">
        <Dialog.Content>
          <TopMenuBar.Wrapper className="mb-3">
            <TopMenuBar.Left />
            <TopMenuBar.Middle>Twitter</TopMenuBar.Middle>
          </TopMenuBar.Wrapper>
          <div className="md:space-y-1 md:px-3">
            {twitter.map((data) => (
              <a
                key={data.id}
                href={data.link}
                target="_blank"
                className="inline-block w-full p-3 hover:bg-code-figcaption dark:hover:bg-white/10 max-md:py-2 md:rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="relative aspect-square w-12 shrink-0 self-start md:w-16">
                    <Image
                      src={data.img}
                      fill
                      alt=""
                      className="aspect-square rounded-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-medium">{data.name}</span>
                    <span className="-mt-1 text-sm text-muted">
                      {data.username}
                    </span>
                    <span className="mt-2 hidden text-sm md:block">
                      {data.description}
                    </span>
                  </div>
                </div>
                <span className="mt-2 inline-block text-sm leading-5 md:hidden">
                  {data.description}
                </span>
              </a>
            ))}

            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted md:hidden">
              Click on each profile to visit
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Dialog>
    </>
  );
}

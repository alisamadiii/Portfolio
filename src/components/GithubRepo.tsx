"use client";

import React from "react";

import * as Dialog from "./Dialog";
import * as TopMenuBar from "./TopMenuBar";

import { useElementsOpening } from "@/context/useElementOpening";

type Props = {};

export default function GithubRepo({}: Props) {
  const { setCurrentOpen } = useElementsOpening();

  return (
    <Dialog.Dialog id="github-repo" className="px-4">
      <Dialog.Content className="h-auto rounded-xl pb-8">
        <TopMenuBar.Wrapper className="mb-3">
          <TopMenuBar.Middle>Github Repo</TopMenuBar.Middle>
        </TopMenuBar.Wrapper>
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 24 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-24"
          >
            <path
              d="M12 2.84601C10.6868 2.84601 9.38642 3.10467 8.17317 3.60721C6.95991 4.10976 5.85752 4.84635 4.92893 5.77494C3.05357 7.6503 2 10.1938 2 12.846C2 17.266 4.87 21.016 8.84 22.346C9.34 22.426 9.5 22.116 9.5 21.846V20.156C6.73 20.756 6.14 18.816 6.14 18.816C5.68 17.656 5.03 17.346 5.03 17.346C4.12 16.726 5.1 16.746 5.1 16.746C6.1 16.816 6.63 17.776 6.63 17.776C7.5 19.296 8.97 18.846 9.54 18.606C9.63 17.956 9.89 17.516 10.17 17.266C7.95 17.016 5.62 16.156 5.62 12.346C5.62 11.236 6 10.346 6.65 9.63601C6.55 9.38601 6.2 8.34601 6.75 6.99601C6.75 6.99601 7.59 6.72601 9.5 8.01601C10.29 7.79601 11.15 7.68601 12 7.68601C12.85 7.68601 13.71 7.79601 14.5 8.01601C16.41 6.72601 17.25 6.99601 17.25 6.99601C17.8 8.34601 17.45 9.38601 17.35 9.63601C18 10.346 18.38 11.236 18.38 12.346C18.38 16.166 16.04 17.006 13.81 17.256C14.17 17.566 14.5 18.176 14.5 19.106V21.846C14.5 22.116 14.66 22.436 15.17 22.346C19.14 21.006 22 17.266 22 12.846C22 11.5328 21.7413 10.2324 21.2388 9.01917C20.7362 7.80592 19.9997 6.70353 19.0711 5.77494C18.1425 4.84635 17.0401 4.10976 15.8268 3.60721C14.6136 3.10467 13.3132 2.84601 12 2.84601Z"
              fill="currentColor"
            />
          </svg>
          <p>Your support is so much valuable.</p>
          <p>
            We really appreciate it if you give the{" "}
            <a
              href="https://github.com/AliReza1083/Portfolio"
              target="_blank"
              className="text-primary"
              onClick={() => setCurrentOpen(null)}
            >
              Repo
            </a>{" "}
            one start.
          </p>
        </div>
      </Dialog.Content>
    </Dialog.Dialog>
  );
}

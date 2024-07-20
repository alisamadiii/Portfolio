// @ts-nocheck

import React from "react";
import "./style.css";
import Wrapper from "@/components/designs/wrapper";

export default function Day1() {
  return (
    <Wrapper className="px-8">
      <div className="relative flex h-[474px] w-full max-w-[960px] flex-col items-center justify-center border">
        {/* Small Circles */}
        <div className="pointer-events-none absolute left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white shadow-[0_0_0_5px_white]" />
        <div className="pointer-events-none absolute right-0 top-0 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border bg-white shadow-[0_0_0_5px_white]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border bg-white shadow-[0_0_0_5px_white]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full border bg-white shadow-[0_0_0_5px_white]" />

        {/* Main Animation Content */}
        <div className="relative grid h-[278px] w-full grid-cols-4 items-center">
          <div className="aspect-square rounded-full border"></div>
          {/* First Animation Content */}
          <div className="animate-wrapper relative aspect-square rounded-full border">
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 1 }}
            >
              <span>
                <img src="https://mailmeteor.com/logos/assets/PNG/Gmail_Logo_512px.png" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 2 }}>
              <span></span>
            </div>
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 3 }}
            >
              <span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/2048px-Slack_icon_2019.svg.png" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 4 }}>
              <span></span>
            </div>
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 5 }}
            >
              <span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 6 }}>
              <span></span>
            </div>
          </div>
          {/* Second Animation Content */}
          <div className="animate-wrapper animate-reverse relative aspect-square rounded-full border">
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 1 }}
            >
              <span>
                <img src="data:image/jpeg;base64,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" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 2 }}>
              <span></span>
            </div>
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 3 }}
            >
              <span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 4 }}>
              <span></span>
            </div>
            <div
              id="social-media-wrapper"
              className="image"
              style={{ "--i": 5 }}
            >
              <span>
                <img src="https://seeklogo.com/images/T/tiktok-app-icon-logo-0F5AD7AE01-seeklogo.com.png" />
              </span>
            </div>
            <div id="social-media-wrapper" className="" style={{ "--i": 6 }}>
              <span></span>
            </div>
          </div>
          <div className="aspect-square rounded-full border"></div>

          {/* Logo */}
          <div
            className="absolute left-1/2 top-1/2 grid h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 grid-cols-5 place-content-center place-items-center gap-y-1 rounded-full bg-white/80 px-7 backdrop-blur-sm"
            style={{
              boxShadow:
                "0 0 0 1px #0e3f7e0a, 0 1px 1px -.5px #2a33450a, 0 3px 3px -1.5px #2a33460a, 0 6px 6px -3px #2a33460a, 0 12px 12px -6px #0e3f7e0a, 0 24px 24px -12px #0e3f7e0a",
            }}
          >
            <div
              className="dot-animation col-span-5 h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 4 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full"
              style={{ "--i": 3 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 3 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 3 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 3 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full"
              style={{ "--i": 3 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 2 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 2 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full"
              style={{ "--i": 2 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 2 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 2 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 1 }}
            />
            <div
              className="dot-animation col-span-3 h-[6px] w-[6px] rounded-full"
              style={{ "--i": 1 }}
            />
            <div
              className="dot-animation h-[6px] w-[6px] rounded-full bg-black"
              style={{ "--i": 1 }}
            />
          </div>

          {/* Gradient Background */}
          <div className="absolute left-0 top-0 h-full w-1/4 bg-gradient-to-r from-white to-transparent"></div>
          <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-white to-transparent"></div>
        </div>

        {/* Text */}
        <div className="mt-12 text-center">
          <h3 className="text-[20px]">24/7 DevOps Support</h3>
          <p className="mt-4 max-w-[472px] text-[#020B20BA]">
            We&apos;re here to help you with everything from cost management to
            architecture, so you&apos;re never left stranded.
          </p>
        </div>
      </div>
    </Wrapper>
  );
}

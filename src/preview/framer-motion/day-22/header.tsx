import React from "react";
import Image from "next/image";

import Hr from "@/components/hr";

export default function Header() {
  return (
    <div className="-mt-[48px]">
      <Image
        src={
          "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/banner-day-22.jpg"
        }
        width={800}
        height={400}
        alt=""
        className="aspect-[16/10] origin-top object-cover object-top"
      />

      <div className="relative mt-[-32px] px-4">
        <Image
          src={
            "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/profile-image-day-22.jpg"
          }
          width={400}
          height={400}
          alt=""
          className="aspect-square h-16 w-16 rounded-full border-4 border-[#E1E1E1] object-cover"
        />

        <h2 className="mt-1 text-lg font-bold leading-5 tracking-tight">
          Ali Reza Samadi
        </h2>
        <p className="mt-1 max-w-[250px] text-sm leading-[1.1rem] text-[#A5A5A5]">
          I love building with Framer-Motion and helping others with solutions.
        </p>
      </div>

      <Hr className="bg-[#D7D7D7]" />
    </div>
  );
}

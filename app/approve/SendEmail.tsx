import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/app/components/select";
import { allBlogs } from ".contentlayer/generated";
import { MdOutlineEmail } from "react-icons/md";

export default function SendEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["emails"],
    queryFn: async () => {
      const { data } = await supabase.from("sending-emails").select("*");

      return data ?? null;
    },
  });

  if (!data) {
    return null;
  }

  const sendingEmail = async () => {
    const findingBlogs = allBlogs.find(
      (blog) => blog.slugAsParams === selectedBlog
    );

    setIsLoading(true);

    if (findingBlogs) {
      const title = findingBlogs.title;
      const blogImage = findingBlogs.blogImage;
      const details = findingBlogs.text_information;
      const linkTo = `${process.env.NEXT_PUBLIC_WEBSITE_URL}${findingBlogs.slug}`;

      await Promise.all(
        data.map(async (d) => {
          const res = await fetch(
            `/api/send-email?title=${title}&username=${d.name}&details=${details}&link_to=${linkTo}&blog_image=${blogImage}&to=${d.email}`,
            {
              method: "POST",
            }
          );

          const data = await res.json();

          console.log(data);
        })
      );

      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="mb-5 mt-12 flex items-center gap-4 text-3xl font-bold">
        <span className="relative rounded bg-box/50 p-2 text-xl">
          <MdOutlineEmail />
          <span className="absolute right-0 top-0 flex h-3 min-w-[12px] -translate-y-1 translate-x-1 items-center justify-center rounded bg-blue-700 text-[10px]">
            {data.length}
          </span>
        </span>
        Send Email!
      </h1>

      <div className="flex flex-col gap-4">
        <Select onValueChange={(value) => setSelectedBlog(value)}>
          <SelectTrigger className="">
            <SelectValue placeholder="Select a blog" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Blogs</SelectLabel>
              {allBlogs.map((blog, index) => (
                <SelectItem key={index} value={blog.slugAsParams}>
                  {blog.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <button
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
          onClick={sendingEmail}
          disabled={selectedBlog === null}
        >
          {isLoading ? "Sending" : `Send Email (${selectedBlog})`}
        </button>
      </div>
    </>
  );
}

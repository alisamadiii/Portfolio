"use server";

import { supabase } from "@/utils/supabase";

async function submitComment(prevState: any, formData: FormData) {
  const comment = formData.get("comment") as string;

  if (comment) {
    try {
      await supabase
        .from("blog-comments")
        .insert({ comment, slug: prevState.slug });

      await fetch("/api/comment-email");

      return {
        message: "sent",
        slug: prevState.slug,
        error: undefined,
      };
    } catch (error) {
      return {
        message: "unsuccessful",
        slug: prevState.slug,
        error,
      };
    }
  }
}

export async function submitCommentForm(
  comment: string,
  slug: string,
  email: string | null
) {
  if (comment) {
    try {
      await supabase.from("blog-comments").insert({ comment, slug, email });

      return {
        message: "sent",
        slug,
        error: undefined,
      };
    } catch (error) {
      return {
        message: "unsuccessful",
        slug,
        error,
      };
    }
  }
}

export interface SendingEmailTypes {
  message: string;
  error: string | undefined;
}

async function sendingEmail(email: string) {
  if (email !== "") {
    const { error } = await supabase.from("sending-emails").insert({ email });

    if (error?.code === "23505") {
      return { message: "Email already exists", error: 23505 };
    } else {
      return { message: "Joined", error: undefined };
    }
  }

  return { message: "add all the fields", error: undefined };
}

export { submitComment, sendingEmail };

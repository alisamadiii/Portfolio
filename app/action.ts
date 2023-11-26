"use server";

import { supabase } from "@/utils/supabase";

async function submitComment(prevState: any, formData: FormData) {
  const comment = formData.get("comment") as string;

  if (comment) {
    try {
      const line = comment.replaceAll(/\n/g, "\\n");

      await supabase
        .from("blog-comments")
        .insert({ comment: line, slug: prevState.slug });

      return { message: "sent", slug: prevState.slug, error: undefined };
    } catch (error) {
      return {
        message: "unsuccessful",
        slug: prevState.slug,
        error,
      };
    }
  }
}

export interface SendingEmailTypes {
  message: string;
  error: string | undefined;
}

async function sendingEmail(_: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (name !== "" || email !== "") {
    const { error } = await supabase
      .from("sending-emails")
      .insert({ email, name });

    if (error?.code === "23505") {
      return { message: "Email already exists", error: 23505 };
    } else {
      return { message: "sent", error: undefined };
    }
  }

  return { message: "add all the fields", error: undefined };
}

export { submitComment, sendingEmail };

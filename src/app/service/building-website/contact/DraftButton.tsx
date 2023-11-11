import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { UseUserContext } from "@/context/User.context";
import { supabase } from "@/utils/supabase";
import { useContactStore } from "@/context/Contact.context";
import { RotatingLines } from "react-loader-spinner";

export default function DraftButton() {
  const [status, setStatus] = useState({ isLoading: false, isSuccess: false });

  const { currentUser } = UseUserContext();
  const { name, email, page } = useContactStore();

  const onDraftHandler = async () => {
    setStatus({ isLoading: true, isSuccess: false });
    await supabase.from("contact-form").upsert(
      {
        userId: currentUser?.user.user_metadata.provider_id,
        email,
        name,
        page,
        status: "DRAFT",
      },
      { onConflict: "email" }
    );
    setStatus({ isLoading: false, isSuccess: true });
  };

  return (
    <Button variant={"outline"} size={"md"} onClick={onDraftHandler}>
      {status.isLoading && (
        <RotatingLines
          strokeColor="white"
          strokeWidth="3"
          animationDuration="1"
          width="16"
          visible={true}
        />
      )}
      {status.isSuccess ? "Saved" : "Save"}
    </Button>
  );
}

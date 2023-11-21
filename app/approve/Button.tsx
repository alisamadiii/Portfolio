import { supabase } from "@/utils/supabase";
import { useState } from "react";

export const DeleteButton = ({ id }: { id: string }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeletingHandler = async (id: string) => {
    setIsDeleting(true);
    await supabase.from("blog-comments").delete().eq("id", id);
    setIsDeleting(false);
  };

  return (
    <button
      className="rounded bg-red-700 px-3 py-1"
      onClick={() => onDeletingHandler(id)}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
};

export const ApproveButton = ({ id }: { id: string }) => {
  const [isApproving, setIsApproving] = useState(false);

  const onApprovingHandler = async (id: string) => {
    setIsApproving(true);
    await supabase.from("blog-comments").update({ approve: true }).eq("id", id);
    setIsApproving(false);
  };
  return (
    <button
      className="rounded bg-blue-700 px-3 py-1"
      onClick={() => onApprovingHandler(id)}
    >
      {isApproving ? "Approving..." : "Approve"}
    </button>
  );
};

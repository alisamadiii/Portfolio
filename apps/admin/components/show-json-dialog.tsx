import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";

import { FormattedJSON } from "@/components/json-format";

interface Props {
  data: unknown;
  title: string;
  children: React.ReactNode;
}

export const ShowJSONDialog = ({ data, title, children }: Props) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormattedJSON data={data} />
      </DialogContent>
    </Dialog>
  );
};

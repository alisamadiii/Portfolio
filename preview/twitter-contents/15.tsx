import React from "react";
import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type Props = {};

export default function TwitterContent15({}: Props) {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Popover</Button>
          </DialogTrigger>
          <DialogContent>
            <p>content</p>
          </DialogContent>
        </Dialog>
      </Element.Preview>
    </Element.Wrapper>
  );
}

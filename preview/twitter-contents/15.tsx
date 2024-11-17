import React from "react";
import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function TwitterContent15() {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Popover</Button>
          </DialogTrigger>
          <DialogContent>
            <p>Popover content</p>
          </DialogContent>
        </Dialog>
      </Element.Preview>
    </Element.Wrapper>
  );
}

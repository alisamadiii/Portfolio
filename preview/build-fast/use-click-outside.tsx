import React, { useState } from "react";
import { useClickOutside } from "@mantine/hooks";

import { Button } from "@/components/ui/button";

export default function UseClickOutside() {
  const [isOpen, setIsOpen] = useState(false);

  const ref = useClickOutside(() => setIsOpen(false));

  return (
    <div className="flex justify-center" ref={ref}>
      <Button onClick={() => setIsOpen(true)}>Open</Button>

      {isOpen && (
        <div className="border-wrapper absolute w-full max-w-xl translate-y-12 rounded-md p-4">
          <h2 className="text-lg font-medium">Lorem Ipsum</h2>
          <p className="text-muted">
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil
            incidunt sequi suscipit placeat dolorum doloribus inventore minima
            excepturi dolore sit error quasi, tenetur autem harum impedit.
          </p>
        </div>
      )}
    </div>
  );
}

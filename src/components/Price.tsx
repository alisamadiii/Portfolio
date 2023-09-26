import React from "react";

import * as Choicebox from "@/components/choicebox";
import { Text } from "./ui/text";
import CustomIcon from "@/assets/CustomIcon";
import { useContactStore } from "@/context/Contact.context";

import type { PricingType } from "@/lib/data";

type Props = {
  price: PricingType;
};

export default function Price({ price }: Props) {
  const { level, setLevel } = useContactStore();

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // @ts-ignore
    setLevel(event.target.value);
  };

  return (
    <Choicebox.Group className="flex gap-4 grow basis-56">
      <Choicebox.Item
        name="choicebox"
        value={price.title}
        checked={level == price.title}
        onChange={handleRadioChange}
      >
        <div className="flex justify-between">
          <Text
            as="h3"
            size={24}
            className={`${level == price.title && "text-foreground"}`}
          >
            {price.title}
          </Text>
          <div className="-space-y-1 text-right">
            <Text as="h3" size={16}>
              ${price.price}
            </Text>
            <Text as="h3" size={10}>
              per page
            </Text>
          </div>
        </div>
        <div className="space-y-1">
          <Text as="h3" size={16} className="flex items-center gap-4">
            Design
            <CustomIcon icon={price.job.design ? "service" : "no-service"} />
          </Text>
          <Text as="h3" size={16} className="flex items-center gap-4">
            Coding
            <CustomIcon icon={price.job.coding ? "service" : "no-service"} />
          </Text>
          <Text as="h3" size={16} className="flex items-center gap-4">
            Animation
            <CustomIcon icon={price.job.animation ? "service" : "no-service"} />
          </Text>
        </div>
      </Choicebox.Item>
    </Choicebox.Group>
  );
}

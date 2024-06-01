"use client";

import React, { useState } from "react";
import { Reorder } from "framer-motion";

const InesActiveCard = () => {
  const [items, setItems] = useState([0, 1, 2, 3]);

  return (
    <Reorder.Group axis="y" values={items} onReorder={setItems}>
      {items.map((item) => (
        <Reorder.Item
          key={item}
          value={item}
          className="relative mb-4 w-96 rounded-xl bg-gray-100 p-4"
        >
          {item}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};

export default InesActiveCard;

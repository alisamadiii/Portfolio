import React from "react";

import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

export default function TwitterContents13() {
  const handleAlert = () => {
    window.alert("Hello! This is a popup message.");
  };

  const handleConfirm = () => {
    const result = window.confirm("Do you want to proceed?");
    if (result) {
      window.alert("You clicked OK!");
    } else {
      window.alert("You clicked Cancel!");
    }
  };

  const handlePrompt = () => {
    const name = window.prompt("What's your name?", "Ali Samadi");
    if (name) {
      window.alert(`Hello, ${name}!`);
    } else {
      window.alert("You cancelled the prompt!");
    }
  };

  return (
    <Element.Wrapper>
      <Element.Preview className="flex-row">
        <Button onClick={handleAlert}>Alert</Button>
        <Button onClick={handleConfirm}>Confirm</Button>
        <Button onClick={handlePrompt}>Prompt</Button>
      </Element.Preview>
    </Element.Wrapper>
  );
}

import { Navbar_Context } from "@/context/Navbar_Context";
import React, { useContext } from "react";

type Props = {};

export default function Navbar({}: Props) {
  const { isButton } = useContext(Navbar_Context);

  console.log(isButton);
  return <div>Navbar</div>;
}

import Preloader from "@/components/preloader";
import { UserContext } from "@/context/User.context";
import React, { useContext } from "react";

type Props = {
  children: React.ReactNode;
};

export default function Layouts({ children }: Props) {
  const { currentUser } = useContext(UserContext);

  if (currentUser == null) return <Preloader />;

  return (
    <div>
      {/* Navbar */}
      <nav>Navbar</nav>
      <main>{children}</main>
      <footer>Extra information</footer>
      {/* extra information */}
    </div>
  );
}

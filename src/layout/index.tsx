import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <>
      <nav>Navbar</nav>
      <main>{children}</main>
      <footer>Footer</footer>
    </>
  );
}

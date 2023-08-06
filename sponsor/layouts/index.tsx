import Navbar from "../components/Navbar/Navbar";
import Preloader from "../components/preloader";
import { UserContext } from "../context/User.context";
import React, { useContext } from "react";

type Props = {
  children: React.ReactNode;
};

export default function Layouts({ children }: Props) {
  const { currentUser } = useContext(UserContext);

  if (currentUser == null) return <Preloader />;

  return (
    <div className="flex justify-center w-full gap-9">
      {/* Navbar */}
      <nav className="fixed top-0 flex-col items-start hidden gap-6 pt-1 md:flex md:sticky xl:w-60 h-96">
        <Navbar />
      </nav>
      <main className="w-full max-w-[600px] min-h-screen border-x border-button-hover pb-24">
        {children}
      </main>
      <footer className="sticky top-0 hidden w-full max-w-xs pt-1 h-96 lg:block"></footer>
      {/* extra information */}
    </div>
  );
}

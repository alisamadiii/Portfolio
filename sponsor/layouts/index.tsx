import Navbar from "@/components/Navbar/Navbar";
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
    <div className="flex justify-center w-full gap-9">
      {/* Navbar */}
      <nav className="sticky top-0 flex flex-col items-start gap-6 pt-1 xl:w-60 h-96">
        <Navbar />
      </nav>
      <main className="w-full max-w-[600px] min-h-screen border-x border-button-hover">
        {children}
      </main>
      <footer className="sticky top-0 hidden w-full max-w-xs pt-1 h-96 bg-primary lg:block">
        Extra information
      </footer>
      {/* extra information */}
    </div>
  );
}

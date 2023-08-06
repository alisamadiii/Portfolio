import Button from "@/components/Button";
import Navbar from "../components/Navbar/Navbar";
import Preloader from "../components/preloader";
import { UserContext } from "../context/User.context";
import React, { useContext } from "react";
import { BsArrowLeftShort } from "react-icons/bs";
import VerifiedIcon from "@/public/VerifiedIcon";
import Footer from "@/components/Footer/Footer";

type Props = {
  children: React.ReactNode;
};

export default function Layouts({ children }: Props) {
  const { currentUser } = useContext(UserContext);

  if (currentUser == null) return <Preloader />;

  return (
    <div className="flex justify-center w-full gap-9">
      {/* Navbar */}
      <Navbar />
      <main className="w-full max-w-[600px] min-h-screen border-x border-button-hover pb-12">
        <header className="sticky top-0 z-50 flex items-center gap-4 px-2 py-2 bg-white/90 backdrop-blur-sm md:gap-8">
          <Button className="p-1" onClick={() => window.history.back()}>
            <BsArrowLeftShort className="text-3xl" />
          </Button>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-xl/5">{currentUser?.name}</h1>
              {currentUser?.verified && <VerifiedIcon />}
            </div>
            <small>{currentUser?.total_tweet.toLocaleString()} tweets</small>
          </div>
        </header>
        {children}
      </main>
      <Footer />
    </div>
  );
}

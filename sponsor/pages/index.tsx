import Preloader from "@/components/preloader";
import { UserContext } from "@/context/User.context";
import { Inter } from "next/font/google";
import { useContext } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { currentUser } = useContext(UserContext);
  return (
    <main className={`${inter.className}`}>
      <h1 className="text-x">{currentUser!.name}</h1>
    </main>
  );
}

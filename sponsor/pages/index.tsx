import Preloader from "@/components/preloader";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className={`${inter.className}`}>
      <h1 className="text-x">Hello World</h1>
    </main>
  );
}

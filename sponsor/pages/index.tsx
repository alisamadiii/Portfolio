import Button from "@/components/Button";
import { UserContext } from "@/context/User.context";
import { useContext } from "react";

export default function Home() {
  const { currentUser } = useContext(UserContext);
  return (
    <main>
      <h1 className="text-x">{currentUser!.name}</h1>
    </main>
  );
}

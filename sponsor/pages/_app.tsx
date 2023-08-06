import "../styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../context/User.context";
import Layouts from "../layouts";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Layouts>
        <Component {...pageProps} />
      </Layouts>
    </UserProvider>
  );
}

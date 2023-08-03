import Image from "next/image";
import { Inter, Bebas_Neue } from "next/font/google";
import { Packages } from "../content/Data";

const inter = Inter({ subsets: ["latin"] });
const bebas_beue = Bebas_Neue({ subsets: ["latin"], weight: ["400"] });

export default function Home() {
  return (
    <main className={`${inter.className} p-2 md:p-4 lg:p-8 pb-0`}>
      <Image
        src={"/Gradient background.png"}
        width={1200}
        height={900}
        alt="grainy background"
        className="absolute inset-0 object-cover w-full h-full -z-50"
      />
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-b from-transparent to-light-blue h-1/2 -z-40" />
      <div className="bg-light-blue rounded-t-2xl">
        <header className="flex flex-col items-center p-4 py-8 text-center">
          <h1 className={`${bebas_beue.className} text-5xl`}>
            Unlock the Potential of{" "}
            <span className="text-twitter">Twitter</span>
          </h1>
          <p className="mt-3">
            Twitter is your next big marketing channel, and our sponsored posts
            will deliver incredible results for you.
          </p>
          <Image
            src={"/image header.png"}
            width={700}
            height={700}
            alt="grainy background"
            className=""
          />
        </header>
        <section className="py-16 text-center">
          <h1 className={`${bebas_beue.className} text-5xl mb-12`}>
            Sponsored Post Offers
          </h1>
          <div className="w-full max-w-[1300px] mx-auto flex gap-4 flex-wrap">
            {Packages.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-md grow basis-72 shadow-container"
              >
                <div className="flex items-center justify-between text-xl text-black">
                  <div className="flex items-center gap-1">
                    <svg
                      width="27"
                      height="31"
                      viewBox="0 0 27 31"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14.2016 0.790105H14.2046L25.1256 7.43211C25.6826 7.7751 26.0216 8.3881 26.0216 9.0341V21.4741C26.0216 22.4101 25.5396 23.3121 24.7076 23.8101L14.1646 30.2161C13.8646 30.4009 13.5191 30.4988 13.1666 30.4988C12.8142 30.4988 12.4687 30.4009 12.1686 30.2161L1.62265 23.8081C1.22229 23.5642 0.891405 23.2214 0.661812 22.8126C0.432219 22.4039 0.311633 21.9429 0.311646 21.4741V9.0341C0.311646 8.3981 0.643646 7.7731 1.21965 7.4341L12.1506 0.784105C12.4607 0.597979 12.8158 0.500156 13.1775 0.501214C13.5391 0.502271 13.8936 0.602168 14.2026 0.790105H14.2016ZM13.1716 2.5041L3.39465 8.4511L6.90465 10.5961L16.6946 4.6451L13.1716 2.5041ZM19.9866 6.6471L10.1816 12.5991L13.1816 14.4311L23.0866 8.5331L19.9866 6.6471ZM2.31165 21.4731C2.31165 21.7331 2.44865 21.9701 2.66165 22.0991L12.1746 27.8791V16.1601L9.07165 14.2651V16.0531C9.07165 16.2931 8.81165 16.4331 8.61165 16.3231L5.93165 14.6931C5.88878 14.6646 5.85359 14.6259 5.82917 14.5806C5.80476 14.5352 5.79187 14.4846 5.79165 14.4331V12.2611L2.31165 10.1351V21.4731ZM23.6716 22.0991L23.6796 22.0951C23.7853 22.0295 23.8722 21.9378 23.9321 21.8289C23.992 21.72 24.0228 21.5974 24.0216 21.4731V10.3031L14.1736 16.1681V27.8701L23.6716 22.0991Z"
                        fill="black"
                      />
                    </svg>
                    <h2 className="capitalize">{item.name}</h2>
                  </div>
                  <p className="text-5xl font-black">${item.price}</p>
                </div>
                <p className="mt-3 mb-4 text-start">{item.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-8">
                  <a
                    href={item.example_URL || "#"}
                    // @ts-ignore
                    target={item.example_URL && "_blank"}
                    className={`bg-[#dfdfdf] py-2 rounded opacity-80 hover:opacity-100 ${
                      item.example_URL == null && "cursor-not-allowed"
                    }`}
                  >
                    Example
                  </a>
                  <a
                    href="https://twitter.com/Ali_Developer05"
                    target="_blank"
                    className="py-2 text-white rounded bg-twitter opacity-80 hover:opacity-100"
                  >
                    Contact Me
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

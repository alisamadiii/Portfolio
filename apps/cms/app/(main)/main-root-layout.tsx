import { About } from "@/components/about";
import { User } from "@/components/user";

export function MainRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background fixed inset-x-0 top-0 z-50">
        <div className="flex items-center gap-2 px-2 py-2 lg:px-4 lg:py-3">
          <About />
          <div className="ml-auto flex items-center gap-2">
            <User align="end" />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 pt-14 lg:pt-16">{children}</main>
    </div>
  );
}

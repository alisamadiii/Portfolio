export function RepoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-shell flex min-h-screen flex-col">
      <main className="min-w-0 flex-1 p-4 [overflow-anchor:none] md:p-8">
        {children}
      </main>
    </div>
  );
}

// Public layout — no sidebar/topbar. The root layout already provides
// <html>/<body> and loads globals.css, so this is just a centered shell.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      {children}
    </div>
  );
}

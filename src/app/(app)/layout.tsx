export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-dd-gray-100">
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

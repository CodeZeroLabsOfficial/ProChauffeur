export default function DispatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100svh-var(--header-height)-3rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100svh-var(--header-height)-4rem)]">
      {children}
    </div>
  );
}

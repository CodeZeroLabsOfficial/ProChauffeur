import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-8 lg:py-12">
        {children}
      </div>
    </div>
  );
}

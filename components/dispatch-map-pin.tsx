import { Flag, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const PIN_ICONS = {
  pickup: UserRound,
  dropoff: Flag
} as const satisfies Record<string, LucideIcon>;

export function DispatchMapPin({
  variant,
  className
}: {
  variant: keyof typeof PIN_ICONS;
  className?: string;
}) {
  const Icon = PIN_ICONS[variant];

  return (
    <div className={cn("relative size-8 drop-shadow-md", className)} aria-hidden>
      <svg viewBox="0 0 40 52" className="size-full">
        <path
          d="M20 50.5C20 50.5 37 33.5 37 20C37 10.6112 29.3888 3 20 3C10.6112 3 3 10.6112 3 20C3 33.5 20 50.5 20 50.5Z"
          fill="#0a0a0a"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <Icon
        className="pointer-events-none absolute left-1/2 top-[17px] size-3.5 -translate-x-1/2 -translate-y-1/2 text-white"
        strokeWidth={2.5}
        absoluteStrokeWidth
      />
    </div>
  );
}

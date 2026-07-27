import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Two-column settings row: title + description on the left, controls on the right. */
export function SettingsSection({
  title,
  description,
  children,
  className,
  contentClassName
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-b py-8 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-10",
        className
      )}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-none">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-sm text-pretty">{description}</p>
        ) : null}
      </div>
      <div className={cn("min-w-0 space-y-4", contentClassName)}>{children}</div>
    </section>
  );
}

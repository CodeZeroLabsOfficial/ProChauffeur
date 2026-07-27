import type { ReactNode } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Card-wrapped two-column settings row: title + description on the left, controls on the right. */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  className,
  contentClassName
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional footer (e.g. Save), rendered below a top border. */
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <section className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-10">
          <div className="space-y-1">
            <h3 className="text-sm font-medium leading-none">{title}</h3>
            {description ? (
              <p className="text-muted-foreground text-sm text-pretty">{description}</p>
            ) : null}
          </div>
          <div className={cn("min-w-0 space-y-4", contentClassName)}>{children}</div>
        </section>
      </CardContent>
      {footer ? (
        <CardFooter className="justify-end border-t">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

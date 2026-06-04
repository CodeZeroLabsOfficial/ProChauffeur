import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IconBadge({
  icon: Icon,
  children,
  className,
  ...props
}: ComponentProps<typeof Badge> & { icon: LucideIcon }) {
  return (
    <Badge className={cn(className)} {...props}>
      <Icon aria-hidden="true" className="-ms-0.5 opacity-60" size={12} />
      {children}
    </Badge>
  );
}

/** Dark pill badges for read-only detail sheet hero sections. */
export function DetailSheetIconBadge({
  icon: Icon,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & { icon: LucideIcon }) {
  return (
    <Badge variant="detail" className={cn(className)} {...props}>
      <Icon aria-hidden="true" className="-ms-0.5" size={12} />
      {children}
    </Badge>
  );
}

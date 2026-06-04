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

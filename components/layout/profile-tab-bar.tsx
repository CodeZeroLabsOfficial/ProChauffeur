import type { ComponentProps, ReactNode } from "react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Underline tabs from the UI kit Profile V2 page (user-profile). */
export const profileV2TabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-4 shadow-none!";

export const profileV2TabsListClassName =
  "-mb-0.5 h-auto! gap-6 overflow-x-auto border-none bg-transparent p-0 [&_[data-slot=tabs-trigger]]:flex-none";

export function ProfileV2TabBar({
  children,
  className,
  contentClassName
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn("border-t", className)}>
      <div className={cn("px-4 sm:px-6 md:px-8", contentClassName)}>
        <TabsList className={profileV2TabsListClassName}>{children}</TabsList>
      </div>
    </div>
  );
}

export function ProfileV2TabTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger className={cn(profileV2TabTriggerClassName, className)} {...props} />;
}

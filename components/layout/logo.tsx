import { CarFrontIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** ProChauffeur wordmark / brandmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}>
      <CarFrontIcon className="size-5" />
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-foreground text-lg font-semibold tracking-tight">ProChauffeur</span>
    </div>
  );
}

export default Logo;

import Image from "next/image";
import { CarFrontIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoMarkProps = {
  logoUrl?: string | null;
  className?: string;
};

/** ProChauffeur wordmark / brandmark. */
export function LogoMark({ logoUrl, className }: LogoMarkProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={32}
        height={32}
        className={cn("size-8 shrink-0 rounded-md object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}>
      <CarFrontIcon className="size-5" />
    </div>
  );
}

type LogoProps = {
  logoUrl?: string | null;
  workspaceName?: string;
  className?: string;
};

export function Logo({ logoUrl, workspaceName = "ProChauffeur", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark logoUrl={logoUrl} />
      <span className="text-foreground text-lg font-semibold tracking-tight">{workspaceName}</span>
    </div>
  );
}

export default Logo;

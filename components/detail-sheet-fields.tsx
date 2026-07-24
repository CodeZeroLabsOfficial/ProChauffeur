"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const detailLabelClass =
  "text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase";

const detailLabelIconClass = "size-3.5 shrink-0 opacity-80";

export function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-semibold">{children}</h4>;
}

export function DetailLabel({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <dt className={detailLabelClass}>
      <Icon className={detailLabelIconClass} aria-hidden />
      {children}
    </dt>
  );
}

export function LabeledDetailValue({
  icon,
  label,
  value,
  href,
  className
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  href?: string;
  className?: string;
}) {
  const trimmed = value?.trim() || "";
  const isEmpty = !trimmed;
  const text = trimmed || "—";
  const hasLink = Boolean(href && trimmed);
  const valueClass = cn("text-sm", isEmpty ? "text-muted-foreground" : "text-foreground");

  return (
    <div className={cn("space-y-1", className)}>
      <DetailLabel icon={icon}>{label}</DetailLabel>
      <dd>
        {hasLink ? (
          <a href={href} className={cn(valueClass, "hover:underline")}>
            {text}
          </a>
        ) : (
          <p className={valueClass}>{text}</p>
        )}
      </dd>
    </div>
  );
}

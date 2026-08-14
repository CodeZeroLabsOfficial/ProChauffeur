"use client";

import type { LucideIcon } from "lucide-react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormWizardStep = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export function FormWizardSteps({
  steps,
  currentIndex
}: {
  steps: readonly FormWizardStep[];
  currentIndex: number;
}) {
  return (
    <ol className="flex items-start gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border text-sm",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary text-primary bg-background",
                  !done && !current && "border-muted-foreground/30 text-muted-foreground"
                )}>
                {done ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span
                className={cn(
                  "text-center text-xs font-medium",
                  current ? "text-foreground" : "text-muted-foreground"
                )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "mt-4 h-px min-w-4 flex-1",
                  index < currentIndex ? "bg-primary" : "bg-border"
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

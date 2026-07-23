"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { ProfileV2TabBar } from "@/components/layout/profile-tab-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProfileHeroCard({
  bannerImageUrl,
  backHref,
  backAriaLabel,
  onEditClick,
  editAriaLabel,
  avatar,
  title,
  meta,
  tabs,
  className
}: {
  bannerImageUrl: string;
  backHref: string;
  backAriaLabel: string;
  onEditClick: () => void;
  editAriaLabel: string;
  avatar: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  tabs: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", className)}>
      <div className="relative">
        <div
          className="bg-muted relative aspect-3/1 w-full bg-cover bg-center md:max-h-[240px]"
          style={{ backgroundImage: `url('${bannerImageUrl}')` }}
          aria-hidden
        />
        <div className="absolute start-4 top-4 z-10">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="bg-background/50 rounded-full">
            <Link href={backHref} aria-label={backAriaLabel}>
              <ChevronLeftIcon />
            </Link>
          </Button>
        </div>
        <div className="absolute end-4 top-4 z-10">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-background/50 rounded-full"
            aria-label={editAriaLabel}
            onClick={onEditClick}>
            <PencilIcon />
          </Button>
        </div>
        <div className="relative -mt-10 flex items-end gap-4 px-4 pb-5 sm:px-6 md:-mt-12 md:px-8 md:pb-6">
          <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10 lg:size-28">
            {avatar}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-1 self-stretch pb-1">
            <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h2>
            {meta}
          </div>
        </div>
      </div>

      <ProfileV2TabBar>{tabs}</ProfileV2TabBar>
    </div>
  );
}

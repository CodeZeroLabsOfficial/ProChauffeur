"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";

export function AccessBlockedEmpty() {
  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia>
          <img
            src="/illustrations/access-blocked.svg"
            alt=""
            className="text-muted-foreground w-40 grayscale dark:invert"
          />
        </EmptyMedia>
        <EmptyTitle className="text-xl">Access to this page is blocked</EmptyTitle>
        <EmptyDescription>
          You don&apos;t have permission to view this. Ask an Admin if you need access.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button size="sm" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

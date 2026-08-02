"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { User } from "@/lib/models";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssignedDriverCard({
  assignedChauffeur,
  categoryLabel,
  title = "Assigned driver",
  headerAction
}: {
  assignedChauffeur: User | undefined;
  categoryLabel: string | null;
  title?: string;
  headerAction?: ReactNode;
}) {
  const name =
    assignedChauffeur?.profile.displayName.trim() || assignedChauffeur?.email || "Driver";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {headerAction ? <CardAction>{headerAction}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {assignedChauffeur ? (
          <Link
            href={`/dashboard/drivers/${assignedChauffeur.id}`}
            className="hover:bg-muted/50 -mx-2 flex items-center gap-4 rounded-lg px-2 py-1 transition-colors">
            <Avatar className="size-12 shrink-0">
              <AvatarImage src={assignedChauffeur.profile.photoURL ?? undefined} alt={name} />
              <AvatarFallback>{generateAvatarFallback(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="text-muted-foreground truncate text-sm">{categoryLabel ?? "—"}</p>
            </div>
          </Link>
        ) : (
          <p className="text-muted-foreground text-sm">No driver assigned.</p>
        )}
      </CardContent>
    </Card>
  );
}

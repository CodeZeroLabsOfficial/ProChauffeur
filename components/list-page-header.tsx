import type { ReactNode } from "react";

export function ListPageHeader({
  title,
  actions
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {actions}
    </div>
  );
}

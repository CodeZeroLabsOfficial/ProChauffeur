import type { ReactNode } from "react";

export type ProfileMiniStatItem = {
  label: string;
  value: ReactNode;
};

export function ProfileMiniStats({ items }: { items: ProfileMiniStatItem[] }) {
  return (
    <div className="bg-muted grid grid-cols-3 divide-x rounded-md border text-center *:py-3">
      {items.map((item) => (
        <div key={item.label}>
          <h5 className="text-lg font-semibold tabular-nums">{item.value}</h5>
          <div className="text-muted-foreground text-sm">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

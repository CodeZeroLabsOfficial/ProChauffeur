import type { ReactNode } from "react";

export type ProfileMiniStatItem = {
  label: string;
  value: ReactNode;
};

export function ProfileMiniStats({ items }: { items: ProfileMiniStatItem[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-white/20 rounded-md border border-[#262626] bg-black text-center text-white *:py-3">
      {items.map((item) => (
        <div key={item.label}>
          <h5 className="text-lg font-semibold tabular-nums">{item.value}</h5>
          <div className="text-sm text-white/70">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type SubNavItem = { title: string; href: string };

/** Vertical sub-navigation used by the Company and Settings sections. */
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  return (
    <Card className="py-0">
      <CardContent className="p-2">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {items.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "shrink-0 justify-start",
                pathname === item.href && "bg-muted hover:bg-muted"
              )}>
              <Link href={item.href}>{item.title}</Link>
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}

export function SectionLayout({
  title,
  description,
  items,
  children
}: {
  title: string;
  description?: string;
  items: SubNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <SubNav items={items} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

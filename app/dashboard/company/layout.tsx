import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Pricing", href: "/dashboard/company/pricing" },
  { title: "Vehicle Classes", href: "/dashboard/company/vehicle-classes" }
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout
      title="Company"
      description="Location-scoped pricing and vehicle classes (open from a location for the right market)."
      items={items}>
      {children}
    </SectionLayout>
  );
}

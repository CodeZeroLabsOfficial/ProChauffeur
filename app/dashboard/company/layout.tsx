import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Overview", href: "/dashboard/company" },
  { title: "Locations", href: "/dashboard/company/locations" },
  { title: "Pricing", href: "/dashboard/company/pricing" },
  { title: "Vehicle Classes", href: "/dashboard/company/vehicle-classes" }
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout
      title="Company"
      description="Configure your chauffeur business: locations and fare pricing."
      items={items}>
      {children}
    </SectionLayout>
  );
}

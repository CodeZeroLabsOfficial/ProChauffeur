import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Overview", href: "/dashboard/company" },
  { title: "Operating Hours", href: "/dashboard/company/operating-hours" },
  { title: "Garages", href: "/dashboard/company/locations" },
  { title: "Pricing", href: "/dashboard/company/pricing" },
  { title: "Vehicle Classes", href: "/dashboard/company/vehicle-classes" }
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout
      title="Company"
      description="Configure your chauffeur business: hours, garages and fare pricing for the active location."
      items={items}>
      {children}
    </SectionLayout>
  );
}

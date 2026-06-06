"use client";

import { ReceiptIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";

export function VehicleProfileFinancialsTab() {
  return (
    <Card>
      <CardContent className="p-0">
        <Empty className="border-0 py-12 md:py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon />
            </EmptyMedia>
            <EmptyTitle className="text-xl">Financial &amp; cost tracking</EmptyTitle>
            <EmptyDescription>
              Purchase or lease price, depreciation, fuel and charging costs, insurance,
              maintenance, total cost of ownership, and booking revenue will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}

import { PricingTable } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flexible, simple, and transparent pricing plans for lawn care and landscaping professionals.",
};

export default function PricingPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-16 flex-1 flex flex-col justify-center">
      <PricingTable for="organization" />
    </div>
  );
}

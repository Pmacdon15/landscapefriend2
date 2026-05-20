"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 1. Import useSearchParams
import { use } from "react";
import { buttonVariants } from "../ui/button";

export default function ServicePageLink({
  datePromise,
}: {
  datePromise: Promise<string>;
}) {
  const searchParams = useSearchParams();

  const dateParam = use(datePromise);
  const date =
    dateParam !== "" ? dateParam : new Date().toLocaleDateString("en-CA");

  const currentParams = new URLSearchParams(searchParams.toString());

  currentParams.set("date", date);

  return (
    <Link
      href={`/clients-service?${currentParams.toString()}`}
      className={buttonVariants({
        variant: "outline",
        size: "lg",
        className:
          "h-14 px-8 text-lg rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-900 transition-all",
      })}
    >
      <CalendarDays className="mr-2 h-5 w-5" />
      Service Routes
    </Link>
  );
}

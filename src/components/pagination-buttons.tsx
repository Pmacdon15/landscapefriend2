import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { buttonVariants } from "./ui/button";

export default function PaginationButtons({
  pagePromise,
  totalPagesPromise,
}: {
  pagePromise: Promise<number>;
  totalPagesPromise: Promise<number>;
}) {
  const page = use(pagePromise);
  const totalPages = use(totalPagesPromise);
  const safePage = Math.max(1, Math.min(page, totalPages));
  if (totalPages > 1)
    return (
      <div className="flex items-center justify-center gap-4">
        <Link
          href={`?page=${safePage - 1}`}
          className={buttonVariants({
            variant: "outline",
            className: safePage <= 1 ? "pointer-events-none opacity-50" : "",
          })}
          aria-disabled={safePage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Link>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Page {safePage} of {totalPages}
        </span>
        <Link
          href={`?page=${safePage + 1}`}
          className={buttonVariants({
            variant: "outline",
            className:
              safePage >= totalPages ? "pointer-events-none opacity-50" : "",
          })}
          aria-disabled={safePage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Link>
      </div>
    );
}

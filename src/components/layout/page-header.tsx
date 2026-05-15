import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  backHref,
  backLabel = "Back",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-4 md:md-8 flex flex-col gap-4", className)}>
      {backHref && (
        <Link
          href={backHref}
          className={buttonVariants({
            variant: "ghost",
            className: "-ml-4 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

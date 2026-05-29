import { Card } from "@/components/ui/card";

export function InvoicesSkeleton() {
  const chartBars = [
    "bar-1",
    "bar-2",
    "bar-3",
    "bar-4",
    "bar-5",
    "bar-6",
    "bar-7",
    "bar-8",
    "bar-9",
    "bar-10",
    "bar-11",
    "bar-12",
  ];
  const tabFilters = ["tab-all", "tab-draft", "tab-sent", "tab-paid"];
  const invoiceCards = [
    "inv-card-1",
    "inv-card-2",
    "inv-card-3",
    "inv-card-4",
    "inv-card-5",
    "inv-card-6",
  ];

  return (
    <div className="w-full flex flex-col gap-6 p-1 md:p-4 animate-pulse">
      {/* Revenue Graph Skeleton */}
      <Card className="w-full h-[330px] border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            {/* Chart Title */}
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" />
            {/* Chart Subtitle */}
            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-48" />
          </div>
          {/* Chart Period Badges */}
          <div className="h-7 w-28 bg-slate-100 dark:bg-slate-900 rounded-full" />
        </div>
        {/* Fake Graph Lines/Bars */}
        <div className="h-[200px] flex items-end gap-3 pt-6 px-2">
          {chartBars.map((barId, barIndex) => {
            const heights = [
              "h-1/3",
              "h-2/3",
              "h-1/2",
              "h-4/5",
              "h-3/4",
              "h-full",
              "h-2/5",
              "h-3/5",
              "h-1/2",
              "h-2/3",
              "h-3/4",
              "h-5/6",
            ];
            return (
              <div
                key={barId}
                className={`w-full ${heights[barIndex]} bg-slate-200/50 dark:bg-slate-800/40 rounded-t-sm`}
              />
            );
          })}
        </div>
      </Card>

      {/* Control Panel Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        {/* Search Bar Skeleton */}
        <div className="w-full sm:w-80 h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />

        {/* Tab Filters Skeleton */}
        <div className="flex bg-slate-100/60 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 self-stretch sm:self-auto justify-between sm:justify-start gap-1">
          {tabFilters.map((tabId) => (
            <div
              key={tabId}
              className="h-7 w-14 bg-slate-200 dark:bg-slate-900 rounded-lg"
            />
          ))}
        </div>

        {/* Create Invoice Button Skeleton */}
        <div className="h-10 w-full sm:w-40 bg-slate-200/60 dark:bg-slate-800/60 rounded-full" />
      </div>

      {/* Invoices Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
        {invoiceCards.map((cardId) => (
          <Card
            key={cardId}
            className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 flex flex-col justify-between h-[230px] overflow-hidden"
          >
            <div>
              {/* Card Header (Invoice Number & Status Badge) */}
              <div className="flex items-start justify-between">
                <div className="space-y-2 w-2/3">
                  {/* Invoice Number */}
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20 font-mono" />
                  {/* Client Name */}
                  <div className="h-4.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                </div>
                {/* Status Badge */}
                <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
              </div>

              {/* Issued and Due Dates Skeletons */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-12" />
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-18" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-14" />
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-18" />
                </div>
              </div>
            </div>

            {/* Card Footer (Amount and Button Details) */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-16" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-24" />
              </div>
              {/* View details button placeholder */}
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

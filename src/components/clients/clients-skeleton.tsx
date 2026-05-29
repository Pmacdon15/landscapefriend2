import { Card, CardContent } from "@/components/ui/card";

export function ClientsSkeleton() {
  const skeletonCards = [
    "client-card-1",
    "client-card-2",
    "client-card-3",
    "client-card-4",
    "client-card-5",
    "client-card-6",
  ];
  const skeletonAddresses = ["address-row-1", "address-row-2"];

  return (
    <div className="w-full flex flex-col md:p-4 gap-4">
      {/* Control Panel: Search & Add Button Skeletons */}
      <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full max-w-md h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl animate-pulse" />
        <div className="ml-auto w-32 h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-full animate-pulse" />
      </div>

      {/* Grid of Client Cards Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        {skeletonCards.map((cardId) => (
          <Card
            key={cardId}
            className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xs animate-pulse overflow-hidden"
          >
            {/* Header Skeleton */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 w-full">
                {/* Avatar Placeholder */}
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-2 w-2/3">
                  {/* Client Name */}
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                  {/* Client Status Badge */}
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-900 rounded w-1/3" />
                </div>
              </div>
              {/* Menu Button Placeholder */}
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-900 shrink-0" />
            </div>

            {/* Content Skeleton */}
            <CardContent className="p-5 pt-4 grid gap-5">
              {/* Contact Information (email, phone) */}
              <div className="space-y-3.5 border-b border-slate-100 dark:border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-900 rounded w-1/2" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-900 rounded w-1/3" />
                </div>
              </div>

              {/* Address List Title */}
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20" />

              {/* Addresses List Skeletons */}
              <div className="space-y-4">
                {skeletonAddresses.map((addrId) => (
                  <div
                    key={addrId}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      {/* Address Text */}
                      <div className="space-y-1.5 w-3/4">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-2/3" />
                      </div>
                      {/* View Photo Button Placeholder */}
                      <div className="h-7 w-7 rounded bg-slate-200 dark:bg-slate-800 shrink-0" />
                    </div>

                    {/* Crew & Schedule Badges placeholders */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-900/60 pt-2.5">
                      <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

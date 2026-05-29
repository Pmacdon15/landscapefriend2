import { Card, CardContent } from "@/components/ui/card";

export function ServiceListSkeleton() {
  const routeCards = [
    "route-item-1",
    "route-item-2",
    "route-item-3",
    "route-item-4",
  ];

  return (
    <div className="space-y-6 animate-pulse">
      {/* Service Header Skeleton */}
      <div className="flex flex-col lg:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
        {/* Left column (Title & Stats Indicators) */}
        <div className="flex flex-col gap-2.5 text-center md:text-left w-full lg:w-auto">
          {/* Header Title Date Placeholder */}
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-64 mx-auto md:mx-0" />

          {/* Admin filter info placeholder */}
          <div className="h-3.5 bg-slate-100 dark:bg-slate-900 rounded w-48 mx-auto md:mx-0" />

          {/* Stats Pills placeholders */}
          <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700" />
            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700" />
            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Right column (Search input & User Selector & Date Picker Skeletons) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search Input Placeholder */}
          <div className="h-10 w-full lg:w-60 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />

          {/* User selector dropdown placeholder */}
          <div className="h-10 w-full sm:w-40 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />

          {/* Date Selector Popover Placeholder */}
          <div className="h-10 w-full sm:w-48 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />
        </div>
      </div>

      {/* Daily Routes List Items Container */}
      <div className="max-w-4xl mx-auto space-y-4">
        {routeCards.map((cardId, index) => (
          <Card
            key={cardId}
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
          >
            <CardContent className="p-0">
              <div className="flex items-center">
                {/* Fake Drag Handle Container */}
                <div className="p-4 text-slate-300 dark:text-slate-700 shrink-0 flex flex-col gap-1 justify-center items-center">
                  <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 py-4 pr-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Info area */}
                      <div className="space-y-2.5">
                        {/* Client Name */}
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-48" />

                        {/* Badges Row */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>

                        {/* Address String */}
                        <div className="flex items-start gap-2 mt-2">
                          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded shrink-0 mt-0.5" />
                          <div className="space-y-1.5 w-60">
                            <div className="h-3.5 bg-slate-100 dark:bg-slate-900 rounded w-full" />
                            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-3/4" />
                          </div>
                        </div>

                        {/* Crew/Assignee Badges Placeholder */}
                        <div className="h-7 w-32 bg-slate-100 dark:bg-slate-900/50 rounded-lg mt-2 border border-slate-100 dark:border-slate-800" />
                      </div>

                      {/* Right: Notes pill placeholder (only in 2nd and 4th cards for high visual fidelity) */}
                      {index % 2 === 1 ? (
                        <div className="flex-1 max-w-md bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/30 dark:border-amber-900/20 rounded-lg p-3 self-center space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-5/6" />
                        </div>
                      ) : (
                        <div className="flex-1 hidden md:block" />
                      )}
                    </div>
                  </div>

                  {/* Completion Action button placeholder */}
                  <div className="shrink-0 self-start md:self-center">
                    <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

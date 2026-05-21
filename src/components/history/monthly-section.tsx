import {
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMonthlyStatsDal } from "@/dal/admin";

export async function MonthlySection() {
  const data = await getMonthlyStatsDal();

  const totalScheduled = data.userStats.reduce(
    (acc, curr) => acc + curr.scheduled,
    0,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2 px-1 text-slate-900 dark:text-slate-100">
        <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        {data.monthName} Performance
      </h2>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-green-200 dark:hover:border-green-800/50 transition-colors relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="pb-2 pt-6">
            <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {data.totalCompleted}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 font-medium uppercase tracking-tight">
              Finished since the 1st
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-2 pt-6">
            <CardTitle className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {totalScheduled}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 font-medium uppercase tracking-tight">
              Remaining this month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pt-6 border-b border-slate-100 dark:border-slate-900/50 bg-slate-50/30 dark:bg-slate-900/10">
          <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Team Member Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Breakdown */}
          <div className="grid divide-y divide-slate-50 dark:divide-slate-900 sm:hidden">
            {data.userStats.map((u) => {
              const total = u.completed + u.scheduled;
              const percent = total > 0 ? Math.round((u.completed / total) * 100) : 0;
              return (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Link
                      href={`?search=${encodeURIComponent(u.name)}`}
                      className="font-bold text-slate-700 dark:text-slate-200 underline decoration-slate-200 underline-offset-4"
                    >
                      {u.name}
                    </Link>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{percent}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg p-2 border border-emerald-100/50 dark:border-emerald-900/20">
                      <span className="text-[10px] font-bold text-emerald-600/70 uppercase block">Done</span>
                      <span className="text-lg font-black text-emerald-600">{u.completed}</span>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-lg p-2 border border-amber-100/50 dark:border-amber-900/20">
                      <span className="text-[10px] font-bold text-amber-600/70 uppercase block">Left</span>
                      <span className="text-lg font-black text-amber-600">{u.scheduled}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                  <TableHead className="pl-6 h-12 font-bold text-xs uppercase tracking-wider text-nowrap">Team Member</TableHead>
                  <TableHead className="text-center h-12 font-bold text-xs uppercase tracking-wider text-nowrap">Completed</TableHead>
                  <TableHead className="text-center h-12 font-bold text-xs uppercase tracking-wider text-nowrap">Remaining</TableHead>
                  <TableHead className="text-right pr-6 h-12 font-bold text-xs uppercase tracking-wider text-nowrap">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.userStats.map((u) => {
                  const total = u.completed + u.scheduled;
                  const percent =
                    total > 0 ? Math.round((u.completed / total) * 100) : 0;

                  return (
                    <TableRow
                      key={u.id}
                      className="border-slate-50 dark:border-slate-900/50 hover:bg-green-50/30 dark:hover:bg-green-900/5 transition-colors"
                    >
                      <TableCell className="font-bold pl-6 py-5 text-slate-700 dark:text-slate-200">
                        <Link
                          href={`?search=${encodeURIComponent(u.name)}`}
                          className="hover:text-primary transition-colors underline decoration-slate-200 dark:decoration-slate-800 underline-offset-4 hover:decoration-primary"
                        >
                          {u.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                          {u.completed}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-5 text-amber-600 dark:text-amber-400 font-extrabold text-base">
                        {u.scheduled}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-24 md:w-32 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block border border-slate-200/50 dark:border-slate-700/50">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-10">
                            {percent}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

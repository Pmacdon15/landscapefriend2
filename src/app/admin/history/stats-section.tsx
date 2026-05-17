import {
  BarChart3,
  CheckCircle2,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPastServicesStatsDal } from "@/dal/admin";

export async function StatsSection() {
  const stats = await getPastServicesStatsDal();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2 px-1">
        <BarChart3 className="h-5 w-5 text-primary" />
        Lifetime Stats
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Services
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalCuts}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Lifetime completed services
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-sm font-medium text-slate-500">
              Services by Type
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-2">
              {stats.cutsByServiceType.map((s) => (
                <div
                  key={s.service_type}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs font-medium capitalize text-slate-600 dark:text-slate-400">
                    {s.service_type}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-sm font-medium text-slate-500">
              Services per User (Lifetime)
            </CardTitle>
            <Users className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {stats.cutsByUser.map((u) => (
                <div
                  key={u.user_id || u.user_name}
                  className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900 pb-1.5"
                >
                  <span className="text-xs font-medium truncate max-w-30 text-slate-600 dark:text-slate-400">
                    {u.user_name || "Unknown"}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {u.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

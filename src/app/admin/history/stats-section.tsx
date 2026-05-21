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
      <h2 className="text-xl font-bold flex items-center gap-2 px-1 text-slate-900 dark:text-slate-100">
        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
        Lifetime Stats
      </h2>
      <div className="grid gap-6">
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-green-200 dark:hover:border-green-800/50 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Total Services
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500/50" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalCuts}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Lifetime completed services
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-green-200 dark:hover:border-green-800/50 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Services by Type
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-green-500/50" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-2">
              {stats.cutsByServiceType.map((s) => (
                <div
                  key={s.service_type}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs font-bold capitalize text-slate-600 dark:text-slate-400">
                    {s.service_type}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-green-200 dark:hover:border-green-800/50 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Services per User
            </CardTitle>
            <Users className="h-4 w-4 text-green-500/50" />
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-2">
              {stats.cutsByUser.map((u) => (
                <div
                  key={u.user_id || u.user_name}
                  className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900/50 pb-1.5 last:border-0"
                >
                  <span className="text-xs font-bold truncate max-w-[120px] text-slate-600 dark:text-slate-400">
                    {u.user_name || "Unknown"}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
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

"use client";

import { useState } from "react";
import type { RevenueStats } from "@/db/queries/invoices";

export default function InvoicesRevenueGraph({
  stats,
}: {
  stats: RevenueStats[];
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Fallback if no stats exist
  const data = stats.length > 0 ? stats : [{ month: "No Data", revenue: 0 }];

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 60;
  const paddingRight = 20;
  const totalWidth = 650;

  const graphHeight = chartHeight - paddingTop - paddingBottom;
  const graphWidth = totalWidth - paddingLeft - paddingRight;

  const barWidth = Math.max(10, Math.min(45, (graphWidth / data.length) * 0.6));
  const spacing = (graphWidth - barWidth * data.length) / (data.length + 1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getMonthName = (monthStr: string) => {
    if (monthStr === "No Data") return monthStr;
    try {
      const [year, month] = monthStr.split("-");
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    } catch {
      return monthStr;
    }
  };

  // Generate grid values for Y-axis
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Revenue Performance
          </h3>
          <p className="text-xs text-muted-foreground">
            Monthly gross revenue from sent and paid invoices.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100/50 dark:border-green-900/30 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 dark:text-green-400 block">
              Total Revenue
            </span>
            <span className="text-lg font-black text-green-700 dark:text-green-300">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 block">
              Monthly Avg
            </span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">
              {formatCurrency(avgRevenue)}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${totalWidth} ${chartHeight}`}
          className="w-full min-w-[550px] overflow-visible"
          role="img"
          aria-label="Revenue Performance Chart"
        >
          <title>Revenue Performance Chart</title>
          {/* Gradients */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="hoverGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Lines */}
          {gridLines.map((percent, _index) => {
            const yPos = paddingTop + graphHeight * (1 - percent);
            const value = maxRevenue * percent;
            return (
              <g key={percent} className="opacity-40 dark:opacity-20">
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={totalWidth - paddingRight}
                  y2={yPos}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={paddingLeft - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="600"
                  className="font-mono"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, index) => {
            const xPos = paddingLeft + spacing + index * (barWidth + spacing);
            const rawHeight = (d.revenue / maxRevenue) * graphHeight;
            // Prevent 0 height bars from not showing up at all (gives a tiny indicator)
            const barHeight = Math.max(d.revenue > 0 ? 4 : 0, rawHeight);
            const yPos = paddingTop + graphHeight - barHeight;

            const isHovered = hoveredBar === index;

            return (
              <g key={d.month}>
                {/* Visual Bar with Rounded Top */}
                <path
                  d={`
                    M ${xPos} ${yPos + 6}
                    Q ${xPos} ${yPos} ${xPos + 6} ${yPos}
                    L ${xPos + barWidth - 6} ${yPos}
                    Q ${xPos + barWidth} ${yPos} ${xPos + barWidth} ${yPos + 6}
                    L ${xPos + barWidth} ${paddingTop + graphHeight}
                    L ${xPos} ${paddingTop + graphHeight}
                    Z
                  `}
                  fill={isHovered ? "url(#hoverGradient)" : "url(#barGradient)"}
                  filter={isHovered ? "url(#glow)" : undefined}
                  className="transition-all duration-300"
                />

                {/* X Axis Label */}
                <text
                  x={xPos + barWidth / 2}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? "#15803d" : "#64748b"}
                  fontSize="11"
                  fontWeight={isHovered ? "700" : "600"}
                  className="transition-all duration-200"
                >
                  {getMonthName(d.month)}
                </text>

                {/* Floating Value Card on Hover */}
                {isHovered && d.revenue > 0 && (
                  <g>
                    <rect
                      x={xPos + barWidth / 2 - 50}
                      y={yPos - 35}
                      width="100"
                      height="24"
                      rx="6"
                      fill="#0f172a"
                      className="shadow-xl"
                    />
                    <text
                      x={xPos + barWidth / 2}
                      y={yPos - 19}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {formatCurrency(d.revenue)}
                    </text>
                  </g>
                )}

                {/* Interactive Overlay Button */}
                <foreignObject
                  x={xPos - spacing / 2}
                  y={paddingTop}
                  width={barWidth + spacing}
                  height={chartHeight - paddingTop}
                >
                  <button
                    type="button"
                    className="w-full h-full cursor-pointer focus:outline-none bg-transparent border-0 opacity-0"
                    aria-label={`Revenue for ${getMonthName(d.month)}: ${formatCurrency(d.revenue)}`}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onFocus={() => setHoveredBar(index)}
                    onBlur={() => setHoveredBar(null)}
                  />
                </foreignObject>
              </g>
            );
          })}

          {/* Bottom baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + graphHeight}
            x2={totalWidth - paddingRight}
            y2={paddingTop + graphHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            className="dark:stroke-slate-800"
          />
        </svg>
      </div>
    </div>
  );
}

"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";

interface ChartDataPoint {
  date: string | Date;
  count: number;
}

export function ServiceHistoryChart({ data }: { data: ChartDataPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Parse and sort data chronologically
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((d) => ({
        date: typeof d.date === "string" ? parseISO(d.date) : new Date(d.date),
        count: Number(d.count),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  // Dimension details
  const width = 800;
  const height = 300;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value to scale Y axis
  const maxCount = useMemo(() => {
    if (points.length === 0) return 10;
    const maxVal = Math.max(...points.map((p) => p.count), 0);
    return maxVal === 0 ? 10 : Math.ceil(maxVal * 1.15); // Add 15% headroom
  }, [points]);

  // Map points to SVG coordinates
  const svgPoints = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((p, i) => {
      const x =
        paddingLeft +
        (points.length > 1
          ? (i / (points.length - 1)) * chartWidth
          : chartWidth / 2);
      const y = paddingTop + chartHeight - (p.count / maxCount) * chartHeight;
      return { x, y, original: p };
    });
  }, [points, chartWidth, chartHeight, maxCount]);

  // Build the SVG path string
  const linePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, "");
  }, [svgPoints]);

  // Path for the gradient area under the line
  const areaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const startX = svgPoints[0].x;
    const endX = svgPoints[svgPoints.length - 1].x;
    const bottomY = paddingTop + chartHeight;
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [svgPoints, linePath, chartHeight]);

  return (
    <div className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs backdrop-blur-md relative group hover:border-green-200 dark:hover:border-green-800/50 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Activity History
          </h3>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Completed Services Trend
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Daily services completed over the last 30 active days
          </p>
        </div>
        {hoveredPoint !== null && svgPoints[hoveredPoint] && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-3 py-1.5 rounded-lg flex items-center gap-3 self-start sm:self-center transition-all">
            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
              {format(svgPoints[hoveredPoint].original.date, "MMM d, yyyy")}:
            </span>
            <span className="text-sm font-black text-green-900 dark:text-white">
              {svgPoints[hoveredPoint].original.count} Cuts
            </span>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-600 font-medium">
          No history data available for the trend chart.
        </div>
      ) : (
        <div className="relative overflow-visible w-full h-[250px] sm:h-[300px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <title>Completed Services Trend Chart</title>
            <defs>
              {/* Area Gradient */}
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
              {/* Line Glow Filter */}
              <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="4"
                  floodColor="#22c55e"
                  floodOpacity="0.15"
                />
              </filter>
            </defs>

            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingTop + ratio * chartHeight;
              const val = Math.round(maxCount * (1 - ratio));
              return (
                <g key={ratio} className="opacity-40 dark:opacity-20">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="text-slate-300 dark:text-slate-700"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels (subset to avoid crowding) */}
            {svgPoints.map((p, i) => {
              // Show label for first, last, and every Nth item
              const shouldShowLabel =
                i === 0 ||
                i === svgPoints.length - 1 ||
                (svgPoints.length > 6 &&
                  i % Math.ceil(svgPoints.length / 5) === 0);

              if (!shouldShowLabel) return null;

              return (
                <text
                  key={p.original.date.getTime()}
                  x={p.x}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500 font-sans"
                >
                  {format(p.original.date, "MMM dd")}
                </text>
              );
            })}

            {/* Gradient Area */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke="#22c55e"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* Points (transparent interactive overlay dots) */}
            {svgPoints.map((p, i) => (
              <g key={p.original.date.getTime()}>
                {/* Glowing Dot on Hover */}
                {hoveredPoint === i && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    className="fill-green-500 stroke-white dark:stroke-slate-950 stroke-2"
                  >
                    <animate
                      attributeName="r"
                      values="6;22"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.8;0"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Regular Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === i ? "6" : "3.5"}
                  className={`transition-all duration-150 ${
                    hoveredPoint === i
                      ? "fill-green-600 stroke-white dark:stroke-slate-950 stroke-2"
                      : "fill-green-500 group-hover:fill-green-500 opacity-80"
                  }`}
                />
                {/* Large Invisible Hover Target */}
                {/* biome-ignore lint/a11y/useSemanticElements: circle is an SVG element and cannot be a semantic button */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer focus:outline-none"
                  role="button"
                  aria-label={`View stats for ${format(p.original.date, "MMM dd, yyyy")}`}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onFocus={() => setHoveredPoint(i)}
                  onBlur={() => setHoveredPoint(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                    }
                  }}
                />
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

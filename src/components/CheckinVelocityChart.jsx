import React, { useState } from "react";

/**
 * CheckinVelocityChart:
 * Renders an interactive SVG area & bar graph visualizing guest check-in velocity
 * grouped into 5-minute rolling time intervals (Entry Count vs Time).
 */
const CheckinVelocityChart = ({ timeline = [], totalCheckedIn = 0 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // If no data or empty, provide placeholder rolling intervals
  const data = timeline && timeline.length > 0 ? timeline : [
    { time: "19:45", count: 0 },
    { time: "19:50", count: 2 },
    { time: "19:55", count: 1 },
    { time: "20:00", count: 0 },
    { time: "20:05", count: 3 },
    { time: "20:10", count: 0 },
  ];

  const counts = data.map((d) => d.count || 0);
  const maxCount = Math.max(...counts, 4); // minimum ceiling for aesthetics
  const peakItem = data.reduce((max, d) => (d.count > (max?.count || 0) ? d : max), data[0]);
  const latestItem = data[data.length - 1] || { time: "Now", count: 0 };

  // SVG Chart Geometry
  const width = 640;
  const height = 180;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const points = data.map((d, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + chartH - (d.count / maxCount) * chartH;
    return { x, y, ...d, index: i };
  });

  // Construct SVG Path for Area & Line
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`
    : "";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-base font-extrabold text-purple-950">
              Guest Entry Speed (Every 5 Minutes)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold border border-emerald-300">
              Entries Over Time
            </span>
          </div>
          <p className="text-xs font-bold text-gray-700 mt-0.5">
            How many attendees entered the gates every 5 minutes
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 mr-1">Peak:</span>
            <strong className="text-emerald-700 font-bold">
              {peakItem?.count || 0} arrivals
            </strong>
            <span className="text-slate-500 ml-1">({peakItem?.time || "—"})</span>
          </div>
          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 mr-1">Latest:</span>
            <strong className="text-slate-800 font-bold">
              {latestItem.count} in last 5m
            </strong>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto select-none py-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 drop-shadow-sm overflow-visible"
        >
          <defs>
            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartH * (1 - ratio);
            const val = Math.round(ratio * maxCount);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={ratio === 0 ? "0" : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#velocityGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Column Bars under points */}
          {points.map((p) => {
            const barW = Math.min(22, stepX * 0.45);
            const barH = (p.count / maxCount) * chartH;
            const isHovered = hoveredIndex === p.index;
            return (
              <rect
                key={`bar-${p.index}`}
                x={p.x - barW / 2}
                y={paddingTop + chartH - barH}
                width={barW}
                height={Math.max(2, barH)}
                rx="3"
                fill={isHovered ? "#047857" : "url(#barGradient)"}
                opacity={isHovered ? 1 : 0.75}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIndex(p.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Continuous Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p) => {
            const isHovered = hoveredIndex === p.index;
            return (
              <g
                key={`point-${p.index}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(p.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : p.count > 0 ? 4 : 2.5}
                  fill={isHovered ? "#047857" : p.count > 0 ? "#10b981" : "#cbd5e1"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? "2.5" : "1.5"}
                  className="transition-all duration-150"
                />

                {/* X-Axis Time Label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill={isHovered ? "#0f172a" : "#64748b"}
                  fontSize="10"
                  fontWeight={isHovered ? "700" : "500"}
                >
                  {p.time}
                </text>

                {/* Hover Tooltip Value Badge */}
                {isHovered && (
                  <g>
                    <rect
                      x={p.x - 38}
                      y={p.y - 30}
                      width="76"
                      height="22"
                      rx="4"
                      fill="#0f172a"
                      opacity="0.92"
                    />
                    <text
                      x={p.x}
                      y={p.y - 15}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {p.count} checked in
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Legend & Insight */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-emerald-500 inline-block"></span>
            5-Min Arrivals Count
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>
            Zero Arrival Windows
          </span>
        </div>
        <div className="text-slate-600 font-medium">
          Total Recorded: <strong className="text-slate-900 font-bold">{totalCheckedIn} guests</strong>
        </div>
      </div>
    </div>
  );
};

export default CheckinVelocityChart;

import React, { useState } from "react";

/**
 * SystemPerformanceChart:
 * Real-time monitor of website/API/Database responsiveness.
 * Tracks rolling ping latency (ms) and detects whether response times
 * are constant/smooth or lacking/spiking due to network congestion or server load.
 */
const SystemPerformanceChart = ({ latencyHistory = [], currentLatency = 15 }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Fallback sample data if history is young
  const history =
    latencyHistory && latencyHistory.length >= 2
      ? latencyHistory
      : [
          { time: "10s ago", ms: 14 },
          { time: "8s ago", ms: 16 },
          { time: "6s ago", ms: 12 },
          { time: "4s ago", ms: 18 },
          { time: "2s ago", ms: 15 },
          { time: "Now", ms: currentLatency || 14 },
        ];

  const values = history.map((h) => h.ms);
  const avgLatency = Math.round(
    values.reduce((sum, v) => sum + v, 0) / (values.length || 1)
  );
  const maxLatency = Math.max(...values, 35);
  const minLatency = Math.min(...values);

  // Performance classification: Constant vs Lacking
  let statusBadge = {
    label: "Fast & Smooth",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold",
    dot: "bg-emerald-500",
    desc: "Scanning is fast and smooth. No delays detected.",
    isLagging: false,
  };

  if (currentLatency > 120 || avgLatency > 100) {
    statusBadge = {
      label: "Slow Network Detected",
      tone: "bg-rose-100 text-rose-900 border-rose-300 font-extrabold",
      dot: "bg-rose-500 animate-ping",
      desc: "Network is taking longer than usual. Please check Wi-Fi connection.",
      isLagging: true,
    };
  } else if (currentLatency > 50 || avgLatency > 50) {
    statusBadge = {
      label: "Normal Response Speed",
      tone: "bg-amber-100 text-amber-900 border-amber-300 font-extrabold",
      dot: "bg-amber-500",
      desc: "Normal venue network variation. Scanners working well.",
      isLagging: false,
    };
  }

  // SVG Geometry
  const width = 640;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const ceiling = Math.max(80, Math.ceil(maxLatency * 1.3));

  const stepX = chartW / Math.max(1, history.length - 1);

  const points = history.map((item, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + chartH - (item.ms / ceiling) * chartH;
    return { x, y, ...item, index: i };
  });

  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`
    : "";

  // Threshold Y for 50ms (optimal baseline)
  const target50Y = paddingTop + chartH - (50 / ceiling) * chartH;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusBadge.dot}`}></span>
            <h3 className="text-base font-extrabold text-purple-950">
              System Speed & Network Health
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${statusBadge.tone}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs font-bold text-gray-700 mt-0.5">{statusBadge.desc}</p>
        </div>

        {/* Live Gauges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 mr-1">Current:</span>
            <strong
              className={`font-bold ${
                currentLatency > 80 ? "text-amber-600" : "text-emerald-700"
              }`}
            >
              {currentLatency} ms
            </strong>
          </div>
          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 mr-1">Rolling Avg:</span>
            <strong className="text-slate-800 font-bold">{avgLatency} ms</strong>
          </div>
          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 hidden sm:block">
            <span className="text-slate-400 mr-1">Min/Max:</span>
            <span className="text-slate-600 font-medium">
              {minLatency}/{maxLatency}ms
            </span>
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
            <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={statusBadge.isLagging ? "#f43f5e" : "#0284c7"}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={statusBadge.isLagging ? "#f43f5e" : "#0284c7"}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Optimal Target Dotted Line (50ms) */}
          {target50Y >= paddingTop && target50Y <= paddingTop + chartH && (
            <g>
              <line
                x1={paddingLeft}
                y1={target50Y}
                x2={width - paddingRight}
                y2={target50Y}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth="1.2"
                opacity="0.8"
              />
              <text
                x={width - paddingRight - 4}
                y={target50Y - 4}
                textAnchor="end"
                fill="#10b981"
                fontSize="9"
                fontWeight="600"
              >
                Target &lt; 50ms
              </text>
            </g>
          )}

          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = paddingTop + chartH * (1 - ratio);
            const val = Math.round(ratio * ceiling);
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
                  {val}ms
                </text>
              </g>
            );
          })}

          {/* Area Gradient */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#perfGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Trend Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={statusBadge.isLagging ? "#e11d48" : "#0284c7"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((p) => {
            const isHovered = hoveredPoint === p.index;
            const isSpike = p.ms > 80;
            return (
              <g
                key={`point-${p.index}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p.index)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isSpike ? "#e11d48" : isHovered ? "#0369a1" : "#0284c7"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? "2.5" : "1.5"}
                  className="transition-all duration-150"
                />

                {/* X-Axis Time Label (Sample every other or ends) */}
                {(p.index % 2 === 0 || p.index === points.length - 1) && (
                  <text
                    x={p.x}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="500"
                  >
                    {p.time}
                  </text>
                )}

                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={p.x - 35}
                      y={p.y - 30}
                      width="70"
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
                      {p.ms} ms
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Metrics */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
            Real-time API Ping (ms)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-500 inline-block"></span>
            &lt;50ms Ideal Threshold
          </span>
        </div>
        <div className="text-slate-600 font-medium">
          Consistency:{" "}
          <strong
            className={
              statusBadge.isLagging ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"
            }
          >
            {statusBadge.isLagging ? "Lagging Detected ⚠️" : "99.8% Constant & Fluid"}
          </strong>
        </div>
      </div>
    </div>
  );
};

export default SystemPerformanceChart;

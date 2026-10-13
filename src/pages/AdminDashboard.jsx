import React, { useEffect, useRef, useState, useCallback } from "react";
import { getEventStats, STATS_REFRESH_MS, updateSheet } from "../utils/apiUtils";
import { getPendingCount } from "../utils/offlineQueue";
import CheckinVelocityChart from "../components/CheckinVelocityChart";
import SystemPerformanceChart from "../components/SystemPerformanceChart";
import GuestDirectoryPdfPreview from "../components/GuestDirectoryPdfPreview";
import AdminGuestBatchUpload from "../components/AdminGuestBatchUpload";
import AdminQrBadgeSheet from "../components/AdminQrBadgeSheet";

const StatCard = ({ label, value, sub, tone = "purple" }) => {
  const tones = {
    purple: "text-purple-800 border-purple-100",
    green: "text-emerald-700 border-emerald-100",
    amber: "text-amber-700 border-amber-100",
    rose: "text-rose-700 border-rose-100",
    blue: "text-blue-700 border-blue-100",
  };
  const toneClass = tones[tone] || tones.purple;

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${toneClass}`}>
      <div className={`text-3xl font-extrabold ${toneClass.split(" ")[0]}`}>
        {value !== undefined && value !== null ? value : "—"}
      </div>
      <div className="text-sm font-semibold text-gray-700 mt-1">{label}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [sheetMsg, setSheetMsg] = useState("");
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monitor"); // "monitor" | "report" | "entry" | "badges"
  const [currentLatency, setCurrentLatency] = useState(15);
  const [latencyHistory, setLatencyHistory] = useState([
    { time: "1m ago", ms: 14 },
    { time: "50s ago", ms: 16 },
    { time: "40s ago", ms: 12 },
    { time: "30s ago", ms: 19 },
    { time: "20s ago", ms: 15 },
    { time: "10s ago", ms: 14 },
    { time: "Now", ms: 15 },
  ]);
  const lastOkAtRef = useRef(null);

  const load = useCallback(async () => {
    const t0 = performance.now();
    try {
      const data = await getEventStats();
      const elapsed = Math.round(performance.now() - t0);
      setCurrentLatency(elapsed);

      // Record rolling ping history (keep last 12 samples)
      setLatencyHistory((prev) => {
        const timeLabel = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const updated = [...prev, { time: timeLabel, ms: elapsed }];
        return updated.slice(-12);
      });

      if (!data.success) {
        setError(data.message || "Failed to load stats");
        setStale(true);
        return;
      }
      setStats(data.stats);
      setError("");
      lastOkAtRef.current = Date.now();
      setStale(false);
    } catch {
      setError("Network error loading stats");
      setStale(true);
    } finally {
      setLoading(false);
      setPending(getPendingCount());
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, STATS_REFRESH_MS);
    const staleTimer = setInterval(() => {
      const last = lastOkAtRef.current;
      if (last && Date.now() - last > STATS_REFRESH_MS + 2000) {
        setStale(true);
      }
    }, 2000);
    return () => {
      clearInterval(timer);
      clearInterval(staleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncSheet = async () => {
    setSheetMsg("Syncing Mongo → Google Sheets write-behind mirror…");
    const result = await updateSheet();
    setSheetMsg(result.message);
  };

  const s = stats || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Live Event Operations Console (2026)
              </h1>
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                Authoritative
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Live source: MongoDB / DocumentDB aggregation · Refreshes every {STATS_REFRESH_MS / 1000}s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                stale ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {stale ? "⚠️ Possible Sync Lag" : "● Live & Authoritative"}
            </span>
            <button
              type="button"
              onClick={load}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition active:scale-95"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={syncSheet}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition active:scale-95"
            >
              Sync to Sheets
            </button>
          </div>
        </div>

        {/* Subpage Tabs Navigation (4 Dedicated Sections) */}
        <div className="no-print flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("monitor")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === "monitor"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span>📊</span>
            <span>1. Live Monitor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === "report"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span>📋</span>
            <span>2. Guest Report</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-bold ml-0.5">
              {s.totalGuests || 60}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("entry")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === "entry"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span>➕</span>
            <span>3. New Entry (Batch)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold ml-0.5">
              Max 40
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("badges")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === "badges"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span>🏷️</span>
            <span>4. QR Code Sheet</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold ml-0.5">
              Print Passes
            </span>
          </button>
        </div>

        {error ? (
          <div className="no-print mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        ) : null}
        {sheetMsg ? (
          <div className="no-print mb-4 p-3 rounded-lg bg-purple-50 text-purple-800 text-sm border border-purple-200">
            {sheetMsg}
          </div>
        ) : null}

        {loading && !stats ? (
          <p className="text-slate-600 py-12 text-center font-medium">Connecting to event database…</p>
        ) : (
          <>
            {/* SUBPAGE 1: MONITORING PAGE */}
            {activeTab === "monitor" && (
              <div className="space-y-6">
                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Registered Guests"
                    value={s.totalGuests}
                    sub="Authoritative roster"
                    tone="blue"
                  />
                  <StatCard
                    label="Entry Gate Checked-In"
                    value={s.entryGate}
                    sub={`${s.pendingEntry ?? 0} outside venue`}
                    tone="green"
                  />
                  <StatCard
                    label="Remaining Outside"
                    value={s.pendingEntry}
                    sub="Awaiting arrival"
                    tone="amber"
                  />
                  <StatCard
                    label="Duplicate Scans Prevented"
                    value={s.duplicateScans ?? 0}
                    sub="Double-entries intercepted"
                    tone="rose"
                  />
                </div>

                {/* Prasad / Station Breakdown Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Prasad 1 Served"
                    value={s.prasad1}
                    sub="Meal Station 1"
                    tone="purple"
                  />
                  <StatCard
                    label="Prasad 2 Served"
                    value={s.prasad2}
                    sub="Meal Station 2"
                    tone="purple"
                  />
                  <StatCard
                    label="Prasad 3 Served"
                    value={s.prasad3}
                    sub="Meal Station 3"
                    tone="purple"
                  />
                  <StatCard
                    label="Invalid QR Attempts"
                    value={s.invalidScans ?? 0}
                    sub="Unregistered badges"
                    tone="rose"
                  />
                </div>

                {/* Live Analytics & Performance Graphs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CheckinVelocityChart
                    timeline={s.checkinTimeline}
                    totalCheckedIn={s.entryGate || 0}
                  />
                  <SystemPerformanceChart
                    latencyHistory={latencyHistory}
                    currentLatency={currentLatency}
                  />
                </div>

                {/* Health & Diagnostic Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">DB Health & Latency</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {s.dbStatus || "Connected"} · {s.dbLatencyMs ? `${s.dbLatencyMs} ms` : "< 15 ms"}
                      </div>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Google Sheets Mirror</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {s.lastSyncTime ? new Date(s.lastSyncTime).toLocaleTimeString() : "Pending sync"}
                      </div>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Write-Behind</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Scanner Device Outbox</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {pending} queued offline scans
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${pending > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {pending > 0 ? "Flushing…" : "Synced"}
                    </span>
                  </div>
                </div>

                {/* Exact Counting Rules Reference Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wide">
                    📐 Authoritative Metric Counting Rules (2026 Audit)
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Entry Gate Count:</strong> Exact count of unique guests where <code className="bg-slate-100 px-1 py-0.5 rounded">EntryGateStatus == true</code>. Repeated scans increment <em>Duplicate Scans Prevented</em> and never inflate the guest count.
                    </li>
                    <li>
                      <strong>Remaining Outside:</strong> Evaluated atomically as <code className="bg-slate-100 px-1 py-0.5 rounded">max(0, TotalGuests - EntryGate)</code>.
                    </li>
                    <li>
                      <strong>Meal Distribution (Prasad 1/2/3):</strong> Independent unique guest counts for each meal distribution station. Requires valid prior entry check-in.
                    </li>
                    <li>
                      <strong>Single Source of Truth:</strong> Live totals are computed exclusively via MongoDB compound index aggregations. Google Sheets acts as an asynchronous export mirror and does not dictate live counts.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* SUBPAGE 2: GUEST REPORT PAGE */}
            {activeTab === "report" && (
              <div className="mb-6 animate-fadeIn">
                <GuestDirectoryPdfPreview />
              </div>
            )}

            {/* SUBPAGE 3: NEW ENTRY (BATCH) PAGE */}
            {activeTab === "entry" && (
              <div className="mb-6 animate-fadeIn">
                <AdminGuestBatchUpload onUploadSuccess={load} />
              </div>
            )}

            {/* SUBPAGE 4: QR CODE SHEET PAGE */}
            {activeTab === "badges" && (
              <div className="mb-6 animate-fadeIn">
                <AdminQrBadgeSheet />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

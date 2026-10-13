import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getAllGuests } from "../utils/apiUtils";

/**
 * GuestDirectoryPdfPreview:
 * Live 2-minute auto-refreshing directory preview of all guest records with photos,
 * document links, customizable card size (density), sorting (Entry time, A-Z, Z-A),
 * and high-fidelity PDF print/export.
 */
const GuestDirectoryPdfPreview = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(120);

  // User Customization Controls
  const [cardSize, setCardSize] = useState("standard"); // "compact" | "standard" | "large"
  const [sortBy, setSortBy] = useState("entry_desc"); // "entry_desc" | "entry_asc" | "alpha_asc" | "alpha_desc" | "token_asc"
  const [filterText, setFilterText] = useState("");
  const [filterGate, setFilterGate] = useState("all"); // "all" | "checked_in" | "pending"

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  // Fetch all guests
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllGuests();
      if (res && res.success) {
        setGuests(res.guests || []);
        setError("");
        setLastRefreshedAt(new Date());
        setSecondsUntilRefresh(120);
      } else {
        setError(res?.message || "Failed to load guest directory");
      }
    } catch (err) {
      setError("Network error fetching guest directory");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2-Minute Auto-Refresh Interval
  useEffect(() => {
    fetchGuests();

    // 2-minute interval = 120,000 ms
    intervalRef.current = setInterval(() => {
      fetchGuests();
    }, 120_000);

    // 1-second countdown display
    countdownRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev > 1 ? prev - 1 : 120));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchGuests]);

  // Format Helper: Full Name
  const formatFullName = (guest) => {
    if (!guest) return "Guest";
    if (typeof guest.name === "string") return guest.name.trim();
    const parts = [
      guest.name?.firstName,
      guest.name?.middleName,
      guest.name?.lastName,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : guest.token || "Guest";
  };

  // Sorting & Filtering Logic
  const processedGuests = useMemo(() => {
    let result = [...guests];

    // Filter by search text
    if (filterText.trim()) {
      const q = filterText.toLowerCase().trim();
      result = result.filter((g) => {
        const name = formatFullName(g).toLowerCase();
        const token = (g.token || "").toLowerCase();
        const phone = (g.phoneNumber || "").toLowerCase();
        const altPhone = (g.alternatePhoneNumber || "").toLowerCase();
        return (
          name.includes(q) ||
          token.includes(q) ||
          phone.includes(q) ||
          altPhone.includes(q)
        );
      });
    }

    // Filter by gate status
    if (filterGate === "checked_in") {
      result = result.filter((g) => g.status?.entryGate === true);
    } else if (filterGate === "pending") {
      result = result.filter((g) => !g.status?.entryGate);
    }

    // Sort as requested
    result.sort((a, b) => {
      if (sortBy === "entry_desc") {
        const tA = a.entryTimestamp ? new Date(a.entryTimestamp).getTime() : 0;
        const tB = b.entryTimestamp ? new Date(b.entryTimestamp).getTime() : 0;
        if (tA !== tB) return tB - tA; // most recent check-in first
        return (a.token || "").localeCompare(b.token || "");
      }
      if (sortBy === "entry_asc") {
        const tA = a.entryTimestamp ? new Date(a.entryTimestamp).getTime() : Infinity;
        const tB = b.entryTimestamp ? new Date(b.entryTimestamp).getTime() : Infinity;
        if (tA !== tB) return tA - tB; // earliest check-in first
        return (a.token || "").localeCompare(b.token || "");
      }
      if (sortBy === "alpha_asc") {
        return formatFullName(a).localeCompare(formatFullName(b));
      }
      if (sortBy === "alpha_desc") {
        return formatFullName(b).localeCompare(formatFullName(a));
      }
      if (sortBy === "token_asc") {
        return (a.token || "").localeCompare(b.token || "", undefined, { numeric: true });
      }
      return 0;
    });

    return result;
  }, [guests, filterText, filterGate, sortBy]);

  // Handle PDF Print / Export
  const handlePrintPdf = () => {
    window.print();
  };

  const totalCount = guests.length;
  const checkedInCount = guests.filter((g) => g.status?.entryGate).length;
  const pendingCount = Math.max(0, totalCount - checkedInCount);

  // Layout grid classes based on cardSize
  const gridClasses = {
    compact: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
    standard: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    large: "grid grid-cols-1 md:grid-cols-2 gap-5",
  }[cardSize];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-7">
      {/* Print Stylesheet Hook */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #guest-print-section, #guest-print-section * {
            visibility: visible;
          }
          #guest-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .guest-card-print {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          a[href] {
            color: #2563eb !important;
            text-decoration: underline !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden during print) */}
      <div className="no-print">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <h2 className="text-xl font-extrabold text-purple-950">
                Guest Directory & Attendance Report
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold border border-purple-200">
                Auto-syncs every 2 min
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold text-gray-700 mt-1">
              Live guest roster with entry status, photos, and print-ready report export.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              ⏱ Next sync:{" "}
              <strong className="text-purple-700 font-bold">
                {Math.floor(secondsUntilRefresh / 60)}:
                {(secondsUntilRefresh % 60).toString().padStart(2, "0")}
              </strong>
            </span>

            <button
              type="button"
              onClick={fetchGuests}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95 flex items-center gap-1.5"
              title="Refresh now"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Syncing…" : "Sync Now"}
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Download / Print PDF
            </button>
          </div>
        </div>

        {/* Customization Toolbar: Card Size & Sort & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-100 bg-slate-50/60 -mx-5 px-5 md:-mx-7 md:px-7">
          {/* Card Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Card Size:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setCardSize("compact")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  cardSize === "compact"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Compact (Dense)
              </button>
              <button
                type="button"
                onClick={() => setCardSize("standard")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  cardSize === "standard"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setCardSize("large")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  cardSize === "large"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Large / Detailed
              </button>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            >
              <option value="entry_desc">Entry Time: Recent First (Latest Checked-In)</option>
              <option value="entry_asc">Entry Time: Oldest First</option>
              <option value="alpha_asc">Alphabetical: A → Z (Name)</option>
              <option value="alpha_desc">Alphabetical: Z → A (Name)</option>
              <option value="token_asc">Token ID (Ascending)</option>
            </select>
          </div>

          {/* Gate Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Gate:
            </span>
            <select
              value={filterGate}
              onChange={(e) => setFilterGate(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            >
              <option value="all">All Guests ({totalCount})</option>
              <option value="checked_in">Checked In Only ({checkedInCount})</option>
              <option value="pending">Pending Entry ({pendingCount})</option>
            </select>
          </div>

          {/* Search Filter */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search name, token, phone…"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 py-2.5">
          <div>
            Showing <strong className="text-slate-800">{processedGuests.length}</strong> of{" "}
            <strong>{totalCount}</strong> guests ·{" "}
            <span className="text-emerald-700 font-semibold">{checkedInCount} Checked In</span> ·{" "}
            <span className="text-amber-700 font-semibold">{pendingCount} Outside</span>
          </div>
          <div className="text-slate-400">
            Last preview sync: {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : "Just now"}
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-3 my-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
          {error}
        </div>
      ) : null}

      {/* Main Print / Preview Section */}
      <div id="guest-print-section" className="mt-2">
        {/* Print-Only Header (Appears at top of exported PDF) */}
        <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                DIVINE ENERGY HUB 2026
              </h1>
              <p className="text-sm font-semibold text-slate-700">
                Official Guest Directory & Attendee Verification Manifest
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>Exported: {new Date().toLocaleString()}</div>
              <div>Authoritative Live Record (MongoDB Engine)</div>
              <div>Total: {totalCount} | Checked In: {checkedInCount}</div>
            </div>
          </div>
        </div>

        {/* Guests Cards Grid */}
        {loading && guests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            Loading guest directory preview…
          </div>
        ) : processedGuests.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No guest records match your search or filter criteria.
          </div>
        ) : (
          <div className={gridClasses}>
            {processedGuests.map((guest, idx) => (
              <GuestCard
                key={guest.token || idx}
                guest={guest}
                cardSize={cardSize}
                formatFullName={formatFullName}
              />
            ))}
          </div>
        )}

        {/* Print-Only Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
          Divine Energy Hub 2026 Authoritative Guest Register · Confidential Event Management Document
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Guest Card component supporting Compact, Standard, and Large densities.
 */
const GuestCard = ({ guest, cardSize, formatFullName }) => {
  const isCheckedIn = guest.status?.entryGate === true;
  const fullName = formatFullName(guest);
  const photo = guest.photoUrl || guest.photo;
  const docUrl = guest.documentUrl || guest.document;

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const entryTimeFormatted = guest.entryTimestamp
    ? new Date(guest.entryTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // COMPACT VIEW
  if (cardSize === "compact") {
    return (
      <div className="guest-card-print bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:shadow-sm transition flex items-center gap-3">
        {/* Photo Thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "";
              }}
            />
          ) : (
            <span className="font-extrabold text-xs text-purple-700">{initials || "G"}</span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-900 truncate" title={fullName}>
              {fullName}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isCheckedIn
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isCheckedIn ? "IN" : "OUT"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-1 rounded">
              {guest.token}
            </span>
            <span>{guest.phoneNumber}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>
              {guest.gender || "—"}, {guest.age || "—"}y
            </span>
            {docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold"
                title="View verified document"
              >
                📄 Doc Link
              </a>
            ) : (
              <span className="text-slate-300">No Doc</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LARGE / DETAILED VIEW
  if (cardSize === "large") {
    return (
      <div className="guest-card-print bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row gap-5">
        {/* Large Photo */}
        <div className="w-28 h-32 sm:w-32 sm:h-36 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <span className="text-2xl font-black text-purple-600">{initials || "G"}</span>
              <span className="text-[10px] mt-1 text-slate-400">No Photo</span>
            </div>
          )}
        </div>

        {/* Full Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {fullName}
                </h3>
                <span className="inline-block mt-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                  Token: {guest.token}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  isCheckedIn
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {isCheckedIn
                  ? `✓ Checked In (${entryTimeFormatted || "Live"})`
                  : "⏳ Awaiting Entry"}
              </span>
            </div>

            {/* Demographics & Contact Grid */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div>
                <span className="text-slate-400">Phone: </span>
                <strong className="text-slate-700">{guest.phoneNumber || "—"}</strong>
              </div>
              <div>
                <span className="text-slate-400">Alt Phone: </span>
                <strong className="text-slate-700">{guest.alternatePhoneNumber || "—"}</strong>
              </div>
              <div>
                <span className="text-slate-400">Demographics: </span>
                <strong className="text-slate-700">
                  {guest.gender || "—"}, {guest.age ? `${guest.age} yrs` : "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Email: </span>
                <strong className="text-slate-700 truncate inline-block max-w-[140px]" title={guest.email}>
                  {guest.email || "—"}
                </strong>
              </div>
            </div>
          </div>

          {/* Document Link & Meal Badges */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Document:</span>
              {docUrl ? (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition"
                >
                  📄 View Verified Document
                </a>
              ) : (
                <span className="text-slate-400 italic">No document file</span>
              )}
            </div>

            {/* Station Badges */}
            <div className="flex items-center gap-1 text-[11px]">
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  guest.status?.prasad1 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                P1
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  guest.status?.prasad2 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                P2
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  guest.status?.prasad3 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                P3
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD VIEW (Default Balanced)
  return (
    <div className="guest-card-print bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Top Header: Avatar + Name + Check-In Badge */}
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
            {photo ? (
              <img
                src={photo}
                alt={fullName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "";
                }}
              />
            ) : (
              <span className="font-extrabold text-sm text-purple-700">{initials || "G"}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-extrabold text-slate-900 truncate" title={fullName}>
                {fullName}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCheckedIn
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isCheckedIn ? "Entered" : "Pending"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                {guest.token}
              </span>
              <span className="text-xs text-slate-500">
                {guest.gender || "—"}, {guest.age ? `${guest.age}y` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="mt-3 text-xs space-y-0.5 text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
          <div className="flex justify-between">
            <span className="text-slate-400">Phone:</span>
            <span className="font-semibold text-slate-800">{guest.phoneNumber || "—"}</span>
          </div>
          {guest.alternatePhoneNumber ? (
            <div className="flex justify-between">
              <span className="text-slate-400">Alt Phone:</span>
              <span className="text-slate-700">{guest.alternatePhoneNumber}</span>
            </div>
          ) : null}
          {entryTimeFormatted ? (
            <div className="flex justify-between text-emerald-700">
              <span>Entry Time:</span>
              <span className="font-semibold">{entryTimeFormatted}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Footer: Clickable Document Link & Stations */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          {docUrl ? (
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 hover:underline"
              title="Click to view full uploaded document"
            >
              📄 <span>Doc ID Link</span>
            </a>
          ) : (
            <span className="text-slate-300 text-[11px]">No Document</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span
            className={`px-1 rounded font-bold ${
              guest.status?.prasad1 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
            }`}
            title="Prasad 1"
          >
            P1
          </span>
          <span
            className={`px-1 rounded font-bold ${
              guest.status?.prasad2 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
            }`}
            title="Prasad 2"
          >
            P2
          </span>
          <span
            className={`px-1 rounded font-bold ${
              guest.status?.prasad3 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"
            }`}
            title="Prasad 3"
          >
            P3
          </span>
        </div>
      </div>
    </div>
  );
};

export default GuestDirectoryPdfPreview;

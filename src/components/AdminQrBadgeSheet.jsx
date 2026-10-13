import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getAllGuests } from "../utils/apiUtils";

/**
 * AdminQrBadgeSheet:
 * 4th Subpage of Admin Console.
 * Generates printable physical QR Code badge sheets & attendee passes for event check-in.
 * Supports:
 * - Dynamic QR code generation for every guest token
 * - Layout density selector (Standard 8/page, Compact 12/page, Large Pass 4/page)
 * - Filtering by Gate status, Token range, or Search query
 * - Batch selection checkboxes
 * - Print-ready PDF export via window.print() with page break safety
 */
const AdminQrBadgeSheet = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterGate, setFilterGate] = useState("all");
  const [selectedTokens, setSelectedTokens] = useState(new Set());
  const [badgeLayout, setBadgeLayout] = useState("standard"); // "standard" (8/page) | "compact" (12/page) | "large" (4/page)

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllGuests();
      if (res && res.success) {
        setGuests(res.guests || []);
        // Select all by default
        setSelectedTokens(new Set((res.guests || []).map((g) => g.token)));
        setError("");
      } else {
        setError(res?.message || "Failed to load attendees");
      }
    } catch {
      setError("Network error loading attendees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

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

  // Filtered attendees
  const filteredGuests = useMemo(() => {
    let result = [...guests];
    if (filterGate === "checked_in") {
      result = result.filter((g) => g.status?.entryGate);
    } else if (filterGate === "pending") {
      result = result.filter((g) => !g.status?.entryGate);
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      result = result.filter((g) => {
        const name = formatFullName(g).toLowerCase();
        const token = (g.token || "").toLowerCase();
        const phone = (g.phoneNumber || "").toLowerCase();
        return name.includes(q) || token.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [guests, filterGate, filterQuery]);

  // Selected attendees for printing
  const printGuests = useMemo(() => {
    return filteredGuests.filter((g) => selectedTokens.has(g.token));
  }, [filteredGuests, selectedTokens]);

  const toggleSelectAll = () => {
    if (selectedTokens.size === filteredGuests.length) {
      setSelectedTokens(new Set());
    } else {
      setSelectedTokens(new Set(filteredGuests.map((g) => g.token)));
    }
  };

  const toggleToken = (token) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Grid styling per layout density
  const gridLayoutClasses = {
    standard: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4", // 2x4 on A4
    compact: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",  // 3x4 on A4
    large: "grid grid-cols-1 sm:grid-cols-2 gap-6",                    // 2x2 on A4
  }[badgeLayout];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-7">
      {/* Print-specific style hook */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #badge-print-manifest, #badge-print-manifest * {
            visibility: visible !important;
          }
          #badge-print-manifest {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .qr-badge-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.5px solid #64748b !important;
            box-shadow: none !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Screen Control Bar (Hidden during Print) */}
      <div className="no-print">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <h2 className="text-xl font-extrabold text-purple-950">
                Print Guest Passes & QR Badges
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold border border-purple-200">
                Print Cards
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold text-gray-700 mt-1">
              Print physical attendee passes or sheets with QR codes for scanning at entrance gates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchGuests}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              {loading ? "Refreshing…" : "Refresh List"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printGuests.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Badges ({printGuests.length})
            </button>
          </div>
        </div>

        {/* Toolbar: Density & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-100 bg-slate-50/60 -mx-5 px-5 md:-mx-7 md:px-7 my-3">
          {/* Badge Density Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Sheet Format:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setBadgeLayout("standard")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  badgeLayout === "standard"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Standard (8 / page)
              </button>
              <button
                type="button"
                onClick={() => setBadgeLayout("compact")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  badgeLayout === "compact"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Compact Labels (12 / page)
              </button>
              <button
                type="button"
                onClick={() => setBadgeLayout("large")}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  badgeLayout === "large"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Large Pass (4 / page)
              </button>
            </div>
          </div>

          {/* Gate Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Filter:
            </span>
            <select
              value={filterGate}
              onChange={(e) => setFilterGate(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            >
              <option value="all">All Attendees ({guests.length})</option>
              <option value="pending">Outside / Pending Only</option>
              <option value="checked_in">Checked In Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search token, name, phone…"
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

        {/* Selection Bar */}
        <div className="flex items-center justify-between text-xs py-2 text-slate-600">
          <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                filteredGuests.length > 0 && selectedTokens.size === filteredGuests.length
              }
              onChange={toggleSelectAll}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
            />
            <span>Select All {filteredGuests.length} Shown</span>
          </label>

          <span className="text-slate-500">
            Selected: <strong className="text-purple-700 font-bold">{printGuests.length}</strong> badges ready for printing
          </span>
        </div>
      </div>

      {error ? (
        <div className="p-3 my-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
          {error}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* PRINTABLE BADGE MANIFEST CONTAINER                                        */}
      {/* ========================================================================= */}
      <div id="badge-print-manifest" className="mt-4">
        {/* Print-Only Cover Header */}
        <div className="hidden print:block mb-4 pb-3 border-b-2 border-slate-900 text-center">
          <h1 className="text-xl font-black text-slate-900 tracking-wider">
            DIVINE ENERGY HUB 2026 — OFFICIAL ATTENDEE BADGE SHEET
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Print Sheet · Verified QR Verification Codes · Batch Total: {printGuests.length} Passes
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium">
            Generating attendee QR badges…
          </div>
        ) : printGuests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-medium">
            No attendees selected. Choose attendees or clear search to preview badge sheets.
          </div>
        ) : (
          <div className={gridLayoutClasses}>
            {printGuests.map((guest) => {
              const fullName = formatFullName(guest);
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                guest.token || ""
              )}&format=svg`;

              return (
                <div
                  key={guest.token}
                  className={`qr-badge-card relative rounded-2xl border border-slate-300 bg-white p-4 flex flex-col justify-between transition shadow-2xs hover:shadow-md ${
                    badgeLayout === "large" ? "p-6" : badgeLayout === "compact" ? "p-3" : "p-4"
                  }`}
                >
                  {/* Select checkbox for screen */}
                  <div className="no-print absolute top-3 right-3">
                    <input
                      type="checkbox"
                      checked={selectedTokens.has(guest.token)}
                      onChange={() => toggleToken(guest.token)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  {/* Badge Header */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-200">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-800">
                      Divine Energy Hub 2026
                    </span>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Official Entry Pass
                    </div>
                  </div>

                  {/* Main QR Code & Token Center */}
                  <div className="flex flex-col items-center justify-center my-3">
                    <div
                      className={`rounded-xl border border-slate-200 p-2 bg-white flex items-center justify-center shadow-2xs ${
                        badgeLayout === "large"
                          ? "w-36 h-36"
                          : badgeLayout === "compact"
                          ? "w-24 h-24"
                          : "w-28 h-28"
                      }`}
                    >
                      <img
                        src={qrUrl}
                        alt={`QR ${guest.token}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-2 text-center">
                      <span className="inline-block font-mono font-black text-slate-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs">
                        {guest.token}
                      </span>
                    </div>
                  </div>

                  {/* Attendee Details */}
                  <div className="text-center pt-2 border-t border-dashed border-slate-200">
                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug truncate" title={fullName}>
                      {fullName}
                    </h4>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      <span>{guest.phoneNumber || "—"}</span>
                      {guest.gender ? <span> · {guest.gender}</span> : null}
                      {guest.age ? <span>, {guest.age}y</span> : null}
                    </div>

                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 py-0.5 rounded">
                      Verified Attendee Pass
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQrBadgeSheet;

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getAllGuests } from "../utils/apiUtils";

/**
 * AdminQrBadgeSheet:
 * Generates printable physical QR Code stickers & attendee passes.
 * Supports:
 * - 4cm x 4cm sticker layout with vertical sideways attendee name (no phone number)
 * - Sharp (0px) vs Curved (6px/10px) boundary corners
 * - Adjustable name size (Tiny 6.5px to Normal 9.5px) to maximize QR space
 * - Adjustable QR code size (Large 28mm to Max 30.5mm)
 * - Adjustable Token / Pass number size (11px to 15px bold monospace)
 * - Customizable columns per row (2 to 6 per row)
 * - Customizable separation gap between stickers (0mm to 12mm)
 * - Thicker cutting boundary borders (1.5px to 3px solid or dashed)
 * - 100% accurate A4 print output via window.print()
 */
const AdminQrBadgeSheet = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterGate, setFilterGate] = useState("all");
  const [selectedTokens, setSelectedTokens] = useState(new Set());

  // Layout & Sticker Customization Controls
  const [badgeLayout, setBadgeLayout] = useState("sticker4x4"); // "sticker4x4" | "sticker5x5" | "standard" | "compact"
  const [colsPerRow, setColsPerRow] = useState(4); // Number of QR stickers in each row (default 4)
  const [gapMm, setGapMm] = useState(3); // Separation gap between stickers in mm
  const [borderThickness, setBorderThickness] = useState("2px"); // Boundary thickness: "1.5px" | "2px" | "2.5px" | "3px" | "dashed"
  const [cornerStyle, setCornerStyle] = useState("sharp"); // "sharp" (0px) | "curved" (6px) | "extra_curved" (10px)
  const [namePosition, setNamePosition] = useState("left"); // "left" | "right" | "none"
  const [nameFontSize, setNameFontSize] = useState("7.5px"); // "6.5px" | "7.5px" | "8.5px" | "9.5px"
  const [qrSizePreset, setQrSizePreset] = useState("max"); // "normal" (25mm) | "large" (28mm) | "max" (30mm)
  const [tokenFontSize, setTokenFontSize] = useState("13px"); // "11px" | "13px" | "15px"

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

  // Switch layout presets
  const handleLayoutChange = (layout) => {
    setBadgeLayout(layout);
    if (layout === "sticker4x4") {
      setColsPerRow(4);
      setGapMm(3);
      setBorderThickness("2px");
      setCornerStyle("sharp");
      setNamePosition("left");
      setNameFontSize("7.5px");
      setQrSizePreset("max");
      setTokenFontSize("13px");
    } else if (layout === "sticker5x5") {
      setColsPerRow(3);
      setGapMm(4);
      setBorderThickness("2px");
      setCornerStyle("sharp");
      setNamePosition("left");
      setNameFontSize("8.5px");
      setQrSizePreset("max");
      setTokenFontSize("14px");
    } else if (layout === "standard") {
      setColsPerRow(2);
      setGapMm(6);
      setBorderThickness("1.5px");
      setCornerStyle("curved");
      setNamePosition("none");
    } else if (layout === "compact") {
      setColsPerRow(3);
      setGapMm(4);
      setBorderThickness("1.5px");
      setCornerStyle("sharp");
      setNamePosition("none");
    }
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
        return name.includes(q) || token.includes(q);
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

  // Border CSS string
  const computedBorder = useMemo(() => {
    if (borderThickness === "dashed") return "2px dashed #0f172a";
    return `${borderThickness} solid #0f172a`;
  }, [borderThickness]);

  // Border radius CSS string for sharp vs curved corners
  const computedBorderRadius = useMemo(() => {
    if (cornerStyle === "sharp") return "0px";
    if (cornerStyle === "extra_curved") return "10px";
    return "6px"; // "curved"
  }, [cornerStyle]);

  // Card dimensions in mm
  const cardDimensions = useMemo(() => {
    if (badgeLayout === "sticker4x4") return { width: "40mm", height: "40mm" };
    if (badgeLayout === "sticker5x5") return { width: "50mm", height: "50mm" };
    if (badgeLayout === "compact") return { width: "63mm", height: "42mm" };
    return { width: "88mm", height: "62mm" };
  }, [badgeLayout]);

  // Name Strip Width in mm based on font size to maximize QR space
  const nameStripWidthMm = useMemo(() => {
    if (nameFontSize === "6.5px") return 5.0;
    if (nameFontSize === "7.5px") return 5.8;
    if (nameFontSize === "8.5px") return 6.8;
    return 7.8;
  }, [nameFontSize]);

  // QR Image Size in mm
  const qrImageSizeMm = useMemo(() => {
    if (badgeLayout === "sticker5x5") {
      if (qrSizePreset === "max") return "38mm";
      if (qrSizePreset === "large") return "35mm";
      return "32mm";
    }
    // sticker4x4
    if (qrSizePreset === "max") return "29.5mm";
    if (qrSizePreset === "large") return "27.5mm";
    return "25mm";
  }, [badgeLayout, qrSizePreset]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 md:p-6">
      {/* Dynamic Print CSS */}
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
            padding: 4mm !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .badge-grid-print-container {
            display: grid !important;
            grid-template-columns: repeat(${colsPerRow}, ${cardDimensions.width}) !important;
            gap: ${gapMm}mm !important;
            justify-content: flex-start !important;
          }
          .qr-badge-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            background: white !important;
            border: ${computedBorder} !important;
            border-radius: ${computedBorderRadius} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* Screen Control Bar (Hidden during Print) */}
      <div className="no-print space-y-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <h2 className="text-xl md:text-2xl font-extrabold text-purple-950">
                QR Code Pass & Sticker Studio
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold border border-purple-200">
                4×4 cm Stickers
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold text-gray-700 mt-1">
              Print official 4×4 cm QR stickers. Large QR, prominent Pass Number, small sideways name, sharp or curved boundary.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchGuests}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 transition"
            >
              {loading ? "Refreshing…" : "Refresh List"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printGuests.length === 0}
              className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Stickers ({printGuests.length})</span>
            </button>
          </div>
        </div>

        {/* Toolbar Section 1: Preset Size & Layout Selection */}
        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                Sticker Size:
              </span>
              <div className="inline-flex rounded-xl border border-purple-200 bg-white p-1 text-xs shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => handleLayoutChange("sticker4x4")}
                  className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                    badgeLayout === "sticker4x4"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  ⭐ 4cm × 4cm Sticker (Name on Side)
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange("sticker5x5")}
                  className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                    badgeLayout === "sticker5x5"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  5cm × 5cm Sticker
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange("standard")}
                  className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                    badgeLayout === "standard"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  Standard ID Badge (2 / Row)
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange("compact")}
                  className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                    badgeLayout === "compact"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  Compact Card (3 / Row)
                </button>
              </div>
            </div>

            {/* Quick helper badge */}
            <div className="text-xs font-bold text-purple-900 bg-white px-3 py-1 rounded-lg border border-purple-200">
              Sticker Size: <span className="font-extrabold text-purple-950">{cardDimensions.width} × {cardDimensions.height}</span>
            </div>
          </div>

          {/* Toolbar Section 2: Detailed Customizations (Rows, Gap, Border, Corners, Sizes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-purple-100 text-xs">
            {/* 1. Number of QR in each row */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <label className="block font-extrabold text-purple-950 mb-1.5">
                QR Codes in Each Row:
              </label>
              <div className="flex items-center gap-1">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setColsPerRow(num)}
                    className={`flex-1 py-1 rounded font-extrabold text-xs transition ${
                      colsPerRow === num
                        ? "bg-purple-600 text-white"
                        : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="block text-[10px] text-gray-500 mt-1 font-bold">
                {colsPerRow} QR stickers per horizontal line
              </span>
            </div>

            {/* 2. Separation gap between stickers */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-extrabold text-purple-950">
                  Separation Gap:
                </label>
                <span className="font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                  {gapMm} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={gapMm}
                onChange={(e) => setGapMm(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1">
                <span onClick={() => setGapMm(0)} className="cursor-pointer hover:text-purple-700 font-bold">0mm (Touching)</span>
                <span onClick={() => setGapMm(3)} className="cursor-pointer hover:text-purple-700">3mm</span>
                <span onClick={() => setGapMm(6)} className="cursor-pointer hover:text-purple-700">6mm</span>
                <span onClick={() => setGapMm(10)} className="cursor-pointer hover:text-purple-700">10mm</span>
              </div>
            </div>

            {/* 3. Boundary Corner Style (Sharp vs Curved) */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <label className="block font-extrabold text-purple-950 mb-1.5">
                Boundary Corners (Sharp / Curved):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCornerStyle("sharp")}
                  className={`flex-1 py-1 rounded font-extrabold text-xs transition ${
                    cornerStyle === "sharp"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  ■ Sharp (Square)
                </button>
                <button
                  type="button"
                  onClick={() => setCornerStyle("curved")}
                  className={`flex-1 py-1 rounded font-extrabold text-xs transition ${
                    cornerStyle === "curved"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  ▢ Curved (Rounded)
                </button>
                <button
                  type="button"
                  onClick={() => setCornerStyle("extra_curved")}
                  className={`px-2 py-1 rounded font-extrabold text-xs transition ${
                    cornerStyle === "extra_curved"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  Extra Curved
                </button>
              </div>
              <span className="block text-[10px] text-gray-500 mt-1 font-bold">
                {cornerStyle === "sharp" ? "Sharp 90° for scissor cutting" : "Curved for rounded peel-off sticker sheets"}
              </span>
            </div>

            {/* 4. Cutting Boundary Line Style & Thickness */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <label className="block font-extrabold text-purple-950 mb-1.5">
                Boundary Thickness:
              </label>
              <select
                value={borderThickness}
                onChange={(e) => setBorderThickness(e.target.value)}
                className="w-full font-bold bg-purple-50 border border-purple-200 rounded p-1 text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="2px">2px Solid (Thick Cutting Line - Recommended)</option>
                <option value="2.5px">2.5px Solid (Very Thick)</option>
                <option value="3px">3px Solid (Extra Thick Border)</option>
                <option value="1.5px">1.5px Solid (Standard Border)</option>
                <option value="dashed">2px Dashed (Scissor Cut Line)</option>
              </select>
              <span className="block text-[10px] text-gray-500 mt-1 font-bold">
                Dark boundary line for precise cutting
              </span>
            </div>

            {/* 5. Attendee Name Size & Placement */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-extrabold text-purple-950">
                  Sideways Name Size:
                </label>
                <span className="font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded text-[10px]">
                  No Phone #
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { label: "Tiny", size: "6.5px" },
                  { label: "Small", size: "7.5px" },
                  { label: "Medium", size: "8.5px" },
                  { label: "Normal", size: "9.5px" },
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => setNameFontSize(item.size)}
                    className={`flex-1 py-1 rounded font-extrabold text-xs transition ${
                      nameFontSize === item.size
                        ? "bg-purple-600 text-white"
                        : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500 font-bold">
                <span>Side:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setNamePosition("left")}
                    className={`px-1.5 py-0.5 rounded ${namePosition === "left" ? "bg-purple-200 text-purple-900 font-extrabold" : "hover:text-purple-700"}`}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setNamePosition("right")}
                    className={`px-1.5 py-0.5 rounded ${namePosition === "right" ? "bg-purple-200 text-purple-900 font-extrabold" : "hover:text-purple-700"}`}
                  >
                    Right
                  </button>
                  <button
                    type="button"
                    onClick={() => setNamePosition("none")}
                    className={`px-1.5 py-0.5 rounded ${namePosition === "none" ? "bg-purple-200 text-purple-900 font-extrabold" : "hover:text-purple-700"}`}
                  >
                    Hide
                  </button>
                </div>
              </div>
            </div>

            {/* 6. QR Size & Token Number Size */}
            <div className="bg-white p-2.5 rounded-lg border border-purple-200">
              <label className="block font-extrabold text-purple-950 mb-1.5">
                QR & Token Pass Size:
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="block text-[10px] text-gray-500 font-bold mb-0.5">QR Size:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setQrSizePreset("large")}
                      className={`flex-1 py-1 rounded font-extrabold text-xs ${qrSizePreset === "large" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-900 border border-purple-200"}`}
                    >
                      Large
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrSizePreset("max")}
                      className={`flex-1 py-1 rounded font-extrabold text-xs ${qrSizePreset === "max" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-900 border border-purple-200"}`}
                    >
                      Max (Big)
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <span className="block text-[10px] text-gray-500 font-bold mb-0.5">Token Text:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTokenFontSize("13px")}
                      className={`flex-1 py-1 rounded font-extrabold text-xs ${tokenFontSize === "13px" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-900 border border-purple-200"}`}
                    >
                      Large
                    </button>
                    <button
                      type="button"
                      onClick={() => setTokenFontSize("15px")}
                      className={`flex-1 py-1 rounded font-extrabold text-xs ${tokenFontSize === "15px" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-900 border border-purple-200"}`}
                    >
                      XL (Huge)
                    </button>
                  </div>
                </div>
              </div>
              <span className="block text-[10px] text-gray-500 mt-1 font-bold">
                Maximized QR and huge pass number
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Section 3: Filter & Search Attendees */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Gate Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
              Filter:
            </span>
            <select
              value={filterGate}
              onChange={(e) => setFilterGate(e.target.value)}
              className="text-xs font-bold bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            >
              <option value="all">All Guests ({guests.length})</option>
              <option value="pending">Outside Gate Only</option>
              <option value="checked_in">Entered Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by pass number or name…"
              className="w-full text-xs font-bold bg-white border border-purple-200 rounded-lg pl-8 pr-3 py-1.5 text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
            <svg
              className="w-3.5 h-3.5 text-purple-500 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 font-extrabold text-purple-950 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={
                  filteredGuests.length > 0 && selectedTokens.size === filteredGuests.length
                }
                onChange={toggleSelectAll}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
              />
              <span>Select All {filteredGuests.length} Guests</span>
            </label>
            <span className="text-gray-500">
              (Selected: <strong className="text-purple-800 font-extrabold">{printGuests.length}</strong>)
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-3 my-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200 font-bold">
          {error}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* PRINTABLE BADGE / STICKER MANIFEST CONTAINER                              */}
      {/* ========================================================================= */}
      <div id="badge-print-manifest" className="mt-6">
        {/* Print-Only Cover Header */}
        <div className="hidden print:block mb-4 pb-2 border-b-2 border-slate-900 text-center">
          <h1 className="text-base font-black text-slate-900 tracking-wider">
            DIVINE ENERGY HUB 2026 — OFFICIAL ATTENDEE QR STICKERS ({cardDimensions.width} × {cardDimensions.height})
          </h1>
          <p className="text-[10px] text-slate-600">
            Total Selected: {printGuests.length} Passes · Row Layout: {colsPerRow} per row · Gap: {gapMm}mm · Boundary: {cornerStyle}
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-purple-800 font-bold text-sm">
            Generating attendee QR stickers…
          </div>
        ) : printGuests.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-bold text-sm bg-purple-50/40 rounded-xl border border-dashed border-purple-200">
            No attendees selected. Choose attendees or clear search to preview QR stickers.
          </div>
        ) : (
          <div
            className="badge-grid-print-container flex flex-wrap"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${colsPerRow}, ${cardDimensions.width})`,
              gap: `${gapMm}mm`,
              justifyContent: "flex-start",
            }}
          >
            {printGuests.map((guest) => {
              const fullName = formatFullName(guest);
              // SVG vector QR code for maximum razor-sharp print clarity
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                guest.token || ""
              )}&format=svg`;

              const isSticker = badgeLayout.startsWith("sticker");

              return (
                <div
                  key={guest.token}
                  className="qr-badge-card relative bg-white transition hover:shadow-md select-none"
                  style={{
                    width: cardDimensions.width,
                    height: cardDimensions.height,
                    minWidth: cardDimensions.width,
                    minHeight: cardDimensions.height,
                    maxWidth: cardDimensions.width,
                    maxHeight: cardDimensions.height,
                    border: computedBorder,
                    borderRadius: computedBorderRadius,
                    boxSizing: "border-box",
                    padding: isSticker ? "1.0mm" : "3.0mm",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Select Checkbox for Screen Only */}
                  <div className="no-print absolute top-1 right-1 z-10">
                    <input
                      type="checkbox"
                      checked={selectedTokens.has(guest.token)}
                      onChange={() => toggleToken(guest.token)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer bg-white"
                    />
                  </div>

                  {/* 4x4 CM OR 5x5 CM STICKER LAYOUT */}
                  {isSticker ? (
                    <div
                      className="w-full h-full flex overflow-hidden"
                      style={{
                        flexDirection: namePosition === "right" ? "row-reverse" : "row",
                      }}
                    >
                      {/* VERTICAL SIDEWAYS NAME STRIP (NO PHONE NUMBER) */}
                      {namePosition !== "none" && (
                        <div
                          className={`flex items-center justify-center overflow-hidden shrink-0 ${
                            namePosition === "right"
                              ? "border-l border-dashed border-slate-300 pl-[0.5mm]"
                              : "border-r border-dashed border-slate-300 pr-[0.5mm]"
                          }`}
                          style={{
                            width: `${nameStripWidthMm}mm`,
                            minWidth: `${nameStripWidthMm}mm`,
                            maxWidth: `${nameStripWidthMm}mm`,
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                              fontSize: nameFontSize,
                              lineHeight: "1.0",
                              fontWeight: "800",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "#0f172a",
                              maxHeight: "37mm",
                              letterSpacing: "0.2px",
                            }}
                            title={fullName}
                          >
                            {fullName}
                          </div>
                        </div>
                      )}

                      {/* MAIN QR CODE + LARGE TOKEN NUMBER DIRECTLY BELOW IT */}
                      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-[0.5mm]">
                        {/* High Resolution SVG QR Code (Enlarged) */}
                        <div
                          className="flex items-center justify-center bg-white"
                          style={{
                            width: qrImageSizeMm,
                            height: qrImageSizeMm,
                          }}
                        >
                          <img
                            src={qrUrl}
                            alt={`QR ${guest.token}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        {/* Token / Pass Number directly below QR (Enlarged & Bold) */}
                        <div className="mt-[0.6mm] text-center w-full leading-none">
                          <span
                            className="inline-block font-mono font-black text-slate-950 tracking-wider leading-none"
                            style={{
                              fontSize: tokenFontSize,
                              background: "#f1f5f9",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            {guest.token}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CLASSIC ID BADGE LAYOUT */
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* Header */}
                      <div className="text-center pb-1 border-b border-dashed border-slate-200">
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-900">
                          Divine Energy Hub 2026
                        </span>
                        <div className="text-[9px] font-bold text-gray-500 uppercase">
                          Official Entry Pass
                        </div>
                      </div>

                      {/* Center QR & Token */}
                      <div className="flex flex-col items-center justify-center my-1">
                        <div
                          className="p-1 bg-white flex items-center justify-center"
                          style={{
                            width: badgeLayout === "compact" ? "24mm" : "28mm",
                            height: badgeLayout === "compact" ? "24mm" : "28mm",
                          }}
                        >
                          <img
                            src={qrUrl}
                            alt={`QR ${guest.token}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        <div className="mt-1 text-center">
                          <span className="inline-block font-mono font-black text-slate-950 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs">
                            {guest.token}
                          </span>
                        </div>
                      </div>

                      {/* Attendee Details */}
                      <div className="text-center pt-1 border-t border-dashed border-slate-200">
                        <h4 className="text-xs font-extrabold text-slate-950 truncate" title={fullName}>
                          {fullName}
                        </h4>
                        <div className="text-[10px] font-bold text-gray-600">
                          Verified Attendee Pass
                        </div>
                      </div>
                    </div>
                  )}
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

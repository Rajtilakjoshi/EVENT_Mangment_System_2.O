import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getTokenSeriesInfo, batchUploadGuests } from "../utils/apiUtils";

/**
 * AdminGuestBatchUpload:
 * Enterprise batch upload for Admin with:
 * 1. Live display of current last guest token & next 40-token series range.
 * 2. Download sample CSV template.
 * 3. CSV upload with strict <= 40 guest limit per batch.
 * 4. Paginated preview table showing 20 rows at a time.
 * 5. Mandatory operator/uploader name recording for audit trail.
 * 6. Two-step confirmation (double-check safety lock) before committing to MongoDB.
 */
const AdminGuestBatchUpload = ({ onUploadSuccess }) => {
  // Token series state
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // Upload & parse state
  const [rawGuests, setRawGuests] = useState([]);
  const [fileName, setFileName] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [parseError, setParseError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Double-lock confirmation dialog states
  // 0: Closed, 1: First Confirmation, 2: Final Critical Authorization
  const [confirmStep, setConfirmStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Load current token series info
  const fetchSeries = useCallback(async () => {
    setLoadingSeries(true);
    try {
      const res = await getTokenSeriesInfo();
      if (res && res.success) {
        setSeriesInfo(res.series);
      }
    } catch (e) {
      console.error("Failed to load token series:", e);
    } finally {
      setLoadingSeries(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // Generate and download sample CSV template
  const downloadSampleCsv = () => {
    const nextStart = seriesInfo?.nextStart || "24Guest091";
    const prefix = seriesInfo?.prefix || "24Guest";
    const lastNum = seriesInfo?.lastNum || 90;
    const padLen = seriesInfo?.padLen || 3;

    const row1Token = `${prefix}${(lastNum + 1).toString().padStart(padLen, "0")}`;
    const row2Token = `${prefix}${(lastNum + 2).toString().padStart(padLen, "0")}`;
    const row3Token = `${prefix}${(lastNum + 3).toString().padStart(padLen, "0")}`;

    const headers = [
      "token",
      "firstName",
      "middleName",
      "lastName",
      "phoneNumber",
      "alternatePhoneNumber",
      "email",
      "age",
      "gender",
      "photoUrl",
      "documentUrl",
    ].join(",");

    const sampleRow1 = `${row1Token},Rajesh,Kumar,Sharma,9876543210,9876543211,rajesh.sharma@example.com,45,Male,,`;
    const sampleRow2 = `${row2Token},Pooja,Rani,Verma,9812345678,,pooja.verma@example.com,38,Female,,`;
    const sampleRow3 = `${row3Token},Aarav,,Patel,9823456789,9823456790,aarav.patel@example.com,22,Male,,`;

    const csvContent = "data:text/csv;charset=utf-8," + [headers, sampleRow1, sampleRow2, sampleRow3].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sample_guest_import_template_${nextStart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV parsing logic
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setFileName(file.name);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== "string") return;

        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setParseError("The CSV file must contain at least one header row and one guest row.");
          setRawGuests([]);
          return;
        }

        // Parse headers
        const headerRow = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const tokenIdx = headerRow.indexOf("token");
        const fnIdx = headerRow.findIndex((h) => h === "firstname" || h === "first_name" || h === "name");
        const mnIdx = headerRow.findIndex((h) => h === "middlename" || h === "middle_name");
        const lnIdx = headerRow.findIndex((h) => h === "lastname" || h === "last_name");
        const phoneIdx = headerRow.findIndex((h) => h === "phonenumber" || h === "phone" || h === "mobile");
        const altPhoneIdx = headerRow.findIndex((h) => h === "alternatephonenumber" || h === "altphone" || h === "alt_phone");
        const emailIdx = headerRow.indexOf("email");
        const ageIdx = headerRow.indexOf("age");
        const genderIdx = headerRow.indexOf("gender");
        const photoIdx = headerRow.findIndex((h) => h === "photourl" || h === "photo");
        const docIdx = headerRow.findIndex((h) => h === "documenturl" || h === "document");

        const parsed = [];
        let autoTokenIndex = (seriesInfo?.lastNum || 90) + 1;
        const prefix = seriesInfo?.prefix || "24Guest";
        const padLen = seriesInfo?.padLen || 3;

        for (let i = 1; i < lines.length; i++) {
          // Basic comma split respecting quotes
          const row = lines[i].split(",").map((col) => col.replace(/^"(.*)"$/, "$1").trim());
          if (row.length === 0 || row.every((c) => !c)) continue;

          let token = tokenIdx !== -1 && row[tokenIdx] ? row[tokenIdx] : "";
          if (!token) {
            token = `${prefix}${autoTokenIndex.toString().padStart(padLen, "0")}`;
            autoTokenIndex++;
          }

          const firstName = fnIdx !== -1 && row[fnIdx] ? row[fnIdx] : "";
          const middleName = mnIdx !== -1 && row[mnIdx] ? row[mnIdx] : "";
          const lastName = lnIdx !== -1 && row[lnIdx] ? row[lnIdx] : "";
          const phoneNumber = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : "";
          const altPhone = altPhoneIdx !== -1 && row[altPhoneIdx] ? row[altPhoneIdx] : "";
          const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : "";
          const age = ageIdx !== -1 && row[ageIdx] ? row[ageIdx] : "";
          const gender = genderIdx !== -1 && row[genderIdx] ? row[genderIdx] : "";
          const photoUrl = photoIdx !== -1 && row[photoIdx] ? row[photoIdx] : "";
          const docUrl = docIdx !== -1 && row[docIdx] ? row[docIdx] : "";

          parsed.push({
            rowNumber: i,
            token,
            firstName,
            middleName,
            lastName,
            phoneNumber,
            alternatePhoneNumber: altPhone,
            email,
            age,
            gender,
            photoUrl,
            documentUrl: docUrl,
            isValid: Boolean(firstName && (phoneNumber || token)),
          });
        }

        if (parsed.length === 0) {
          setParseError("No valid rows found in the CSV file.");
          setRawGuests([]);
          return;
        }

        // Check maximum 40 limit rule
        if (parsed.length > 40) {
          setParseError(
            `⚠️ Security Limit Exceeded: At most 40 new guests can be added per batch (your sheet contains ${parsed.length} rows). Please reduce your sheet to at most 40 rows.`
          );
          setRawGuests([]);
          return;
        }

        setRawGuests(parsed);
        setCurrentPage(1);
      } catch (err) {
        setParseError(`Failed to parse CSV file: ${err.message}`);
        setRawGuests([]);
      }
    };
    reader.readAsText(file);
  };

  // Pagination slice (20 rows per page)
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rawGuests.slice(start, start + rowsPerPage);
  }, [rawGuests, currentPage]);

  const totalPages = Math.ceil(rawGuests.length / rowsPerPage) || 1;

  // Handle first validation step
  const handleInitiateUpload = () => {
    if (!uploaderName.trim()) {
      alert("Please enter the Operator / Uploader name before proceeding.");
      return;
    }
    if (rawGuests.length === 0) {
      alert("Please upload and preview a valid guest CSV sheet first.");
      return;
    }
    if (rawGuests.length > 40) {
      alert(`Limit exceeded: Maximum 40 guests allowed (currently ${rawGuests.length}).`);
      return;
    }
    // Open Confirmation Step 1
    setConfirmStep(1);
  };

  // Step 1 confirmed -> Advance to Step 2 (Final Double-Lock)
  const handleStep1Proceed = () => {
    setConfirmStep(2);
  };

  // Step 2 confirmed -> Execute Commit to MongoDB
  const handleFinalCommit = async () => {
    setSubmitting(true);
    try {
      const payloadGuests = rawGuests.map((g) => ({
        token: g.token,
        firstName: g.firstName,
        middleName: g.middleName,
        lastName: g.lastName,
        phoneNumber: g.phoneNumber,
        alternatePhoneNumber: g.alternatePhoneNumber,
        email: g.email,
        age: g.age,
        gender: g.gender,
        photoUrl: g.photoUrl,
        documentUrl: g.documentUrl,
      }));

      const res = await batchUploadGuests(payloadGuests, uploaderName.trim());
      if (res && res.success) {
        setUploadResult({
          success: true,
          count: res.insertedCount,
          tokens: res.insertedTokens,
          uploader: res.uploaderName,
          timestamp: res.uploadedAt,
        });
        setRawGuests([]);
        setFileName("");
        setConfirmStep(0);
        // Refresh token series
        fetchSeries();
        if (onUploadSuccess) onUploadSuccess();
      } else {
        alert(res?.message || "Failed to commit guests to database.");
        setConfirmStep(0);
      }
    } catch (err) {
      alert("Network error committing guests: " + err.message);
      setConfirmStep(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h2 className="text-xl font-extrabold text-slate-900">
              Admin Guest Entry & Batch Sheet Upload
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
              Max 40 / Batch
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Authoritative guest onboarding with double-check authorization, format validation, and series tracking.
          </p>
        </div>

        {/* Action Button: Download Sample Template */}
        <button
          type="button"
          onClick={downloadSampleCsv}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition shadow-xs flex items-center gap-2 active:scale-95"
        >
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Sample Sheet (CSV)
        </button>
      </div>

      {/* Series Range Showcase Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5 p-4 rounded-xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 border border-purple-100">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Last Registered Pass Number
          </span>
          <span className="text-lg font-mono font-extrabold text-purple-950 mt-0.5">
            {loadingSeries ? "Loading…" : seriesInfo?.lastToken || "24Guest090"}
          </span>
          <span className="text-[11px] font-bold text-gray-700 mt-0.5">
            Total registered: <strong>{seriesInfo?.totalGuests || 90}</strong>
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Next Available Pass Number
          </span>
          <span className="text-lg font-mono font-extrabold text-emerald-900 mt-0.5">
            {loadingSeries ? "…" : seriesInfo?.nextStart || "24Guest091"}
          </span>
          <span className="text-[11px] font-bold text-emerald-700 mt-0.5">
            Next sequential pass in series
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
            Allowed Batch Range (Max 40)
          </span>
          <span className="text-base font-mono font-extrabold text-indigo-950 mt-0.5 truncate">
            {seriesInfo?.nextStart || "24Guest091"} → {seriesInfo?.nextRangeEnd40 || "24Guest130"}
          </span>
          <span className="text-[11px] font-bold text-indigo-700 mt-0.5">
            Upload limit: Max 40 guests per batch
          </span>
        </div>
      </div>

      {/* Upload Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
        {/* Operator Name Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Operator / Admin Name <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="e.g. Rajesh Joshi (Event Superadmin)"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Required for tamper-proof database audit trail.
          </p>
        </div>

        {/* File Upload Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Select Guest Data Sheet (.csv) <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-1 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Accepts CSV format. Max 40 records per upload batch.
          </p>
        </div>
      </div>

      {/* Parse Error Box */}
      {parseError && (
        <div className="my-4 p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{parseError}</span>
        </div>
      )}

      {/* Success Banner */}
      {uploadResult && (
        <div className="my-4 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Successfully Uploaded {uploadResult.count} New Guests to MongoDB!
          </div>
          <p className="mt-1 text-slate-600">
            Logged under operator: <strong>{uploadResult.uploader}</strong> at{" "}
            {new Date(uploadResult.timestamp).toLocaleTimeString()}.
          </p>
          <div className="mt-2 font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-emerald-200 text-slate-700">
            Tokens assigned: {uploadResult.tokens?.slice(0, 10).join(", ")}
            {uploadResult.tokens?.length > 10 ? ` … (+${uploadResult.tokens.length - 10} more)` : ""}
          </div>
        </div>
      )}

      {/* Sheet Preview Table (20 rows at a time) */}
      {rawGuests.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Uploaded Sheet Preview ({rawGuests.length} Guests)
              </h3>
              <p className="text-[11px] text-slate-500">
                Showing 20 rows per page. Review all rows carefully before final authorization.
              </p>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700"
              >
                ◀ Prev 20
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700"
              >
                Next 20 ▶
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3">Guest Full Name</th>
                  <th className="py-2.5 px-3">Primary Phone</th>
                  <th className="py-2.5 px-3">Alt Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Demographics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {paginatedGuests.map((g, idx) => {
                  const absoluteIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={g.token || idx} className="hover:bg-purple-50/40 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                        {absoluteIdx}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700">
                        {g.token}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {[g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ")}
                      </td>
                      <td className="py-2 px-3 font-mono">{g.phoneNumber || "—"}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {g.alternatePhoneNumber || "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]" title={g.email}>
                        {g.email || "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {g.gender || "—"}, {g.age ? `${g.age}y` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Upload Initiation Button */}
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRawGuests([]);
                setFileName("");
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel / Clear Sheet
            </button>
            <button
              type="button"
              onClick={handleInitiateUpload}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verify & Prepare Upload ({rawGuests.length} Guests)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION 1: INITIAL BATCH REVIEW PROMPT                                */}
      {/* ========================================================================= */}
      {confirmStep === 1 && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Step 1 of 2: Confirm Batch Review
                </h3>
                <p className="text-xs text-slate-500">
                  Please verify the batch payload details before final lock.
                </p>
              </div>
            </div>

            <div className="my-4 space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Operator In Charge:</span>
                <strong className="text-slate-900 font-bold">{uploaderName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File Name:</span>
                <span className="font-mono text-slate-800">{fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Guests to Add:</span>
                <strong className="text-purple-700 font-bold">{rawGuests.length} guests</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Token Range:</span>
                <strong className="text-emerald-700 font-mono">
                  {rawGuests[0]?.token} → {rawGuests[rawGuests.length - 1]?.token}
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to advance to final authorization for this batch?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmStep(0)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStep1Proceed}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition"
              >
                Yes, Proceed to Final Step 2 ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION 2: FINAL DOUBLE-LOCK AUTHORIZATION MODAL                      */}
      {/* ========================================================================= */}
      {confirmStep === 2 && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-rose-200">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xl">
                🔒
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                  Critical Security Check · Step 2 of 2
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Final Authorization: Commit to Live MongoDB?
                </h3>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
              <strong>WARNING:</strong> This action will permanently write{" "}
              <strong>{rawGuests.length} new attendee records</strong> into the authoritative
              production database under operator <strong>{uploaderName}</strong>.
              <br />
              <br />
              This double-confirmation is required to guarantee no accidental duplicate entries
              occur during event operations.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmStep(0)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Abort & Return
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalCommit}
                className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Committing to MongoDB…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Yes, Commit {rawGuests.length} Guests To Live Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGuestBatchUpload;

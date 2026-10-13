import React, { useEffect, useRef, useState } from "react";
import QrReader from "react-qr-scanner";
import { apiFetch, fastCheckin, scanGuest } from "../utils/apiUtils";
import { cacheGuest, getCachedGuest, patchCachedStatus } from "../utils/guestCache";
import { enqueueMutation } from "../utils/offlineQueue";
import { resolveGuestPhoto } from "../utils/photoCache";
import { getDynamicFacePhotoUrl } from "../utils/firebaseUtils";
import { playSuccessChime, playWarningChime } from "../utils/audioFeedback";

const EntryGateScanner = () => {
  const [showQrScannerEntry, setShowQrScannerEntry] = useState(true);
  const [userData, setUserData] = useState(null);
  const [scannedToken, setScannedToken] = useState("");
  const [prasadData, setPrasadData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusBanner, setStatusBanner] = useState(null); // { type: 'success'|'warning'|'error'|'offline', message: '' }
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const lastScanTimeRef = useRef(0);
  const autoResetTimerRef = useRef(null);

  const reset = () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    setShowQrScannerEntry(true);
    setUserData(null);
    setPrasadData(null);
    setScannedToken("");
    setErrorMsg("");
    setStatusBanner(null);
    setPhotoUrl("");
    setFromCache(false);
    setIsProcessing(false);
  };

  const handleScan = async (data) => {
    const now = Date.now();
    if (!data?.text || isProcessing || !showQrScannerEntry) return;
    if (now - lastScanTimeRef.current < 1000) return;
    lastScanTimeRef.current = now;
    setIsProcessing(true);
    setErrorMsg("");
    setStatusBanner(null);
    const token = String(data.text).trim();
    setScannedToken(token);

    if (autoCheckIn) {
      // High-performance single-trip atomic check-in (<150ms)
      try {
        const result = await fastCheckin(token, "entry");

        if (result.ok && result.success) {
          setShowQrScannerEntry(false);
          setUserData(result.user);
          setPrasadData(result.user?.status);
          resolveGuestPhoto(result.user, getDynamicFacePhotoUrl).then(setPhotoUrl);
          await cacheGuest({ user: result.user, prasad: result.user?.status });

          if (result.alreadyCheckedIn) {
            playWarningChime();
            setStatusBanner({
              type: "warning",
              message: `⚠️ ALREADY CHECKED IN (First entry: ${result.firstCheckedInAt ? new Date(result.firstCheckedInAt).toLocaleTimeString() : "Recorded"})`,
            });
            // Don't auto-reset immediately so guard can verify potential badge sharing
          } else {
            playSuccessChime();
            setStatusBanner({
              type: "success",
              message: "✅ ENTRY VERIFIED & RECORDED",
            });
            // Auto-advance line after 2 seconds
            autoResetTimerRef.current = setTimeout(reset, 2000);
          }
          return;
        }

        if (result.status === 404) {
          playWarningChime();
          setShowQrScannerEntry(false);
          setErrorMsg("❌ UNREGISTERED BADGE — Please direct guest to Registration Desk.");
          return;
        }

        throw new Error(result.message || "Server check-in error");
      } catch (err) {
        // Offline-tolerant fallback
        const cached = await getCachedGuest(token);
        if (cached) {
          setShowQrScannerEntry(false);
          setUserData(cached.user);
          setPrasadData(cached.prasad);
          setFromCache(true);
          resolveGuestPhoto(cached.user, getDynamicFacePhotoUrl).then(setPhotoUrl);

          if (cached.prasad?.entryGate) {
            setStatusBanner({
              type: "warning",
              message: "⚠️ ALREADY CHECKED IN (Local Cache)",
            });
          } else {
            await patchCachedStatus(token, { entryGate: true });
            enqueueMutation({ type: "entry", token });
            setStatusBanner({
              type: "offline",
              message: "🌐 ENTRY RECORDED OFFLINE (Queued for sync)",
            });
            autoResetTimerRef.current = setTimeout(reset, 2500);
          }
          return;
        }

        setShowQrScannerEntry(false);
        setErrorMsg("Network timeout and no offline cache found for this badge.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Manual review mode: lookup first, let volunteer confirm
      try {
        let payload = null;
        let usedCache = false;
        try {
          const live = await scanGuest(token);
          if (live.success) {
            payload = live;
            await cacheGuest(live);
          } else {
            const cached = await getCachedGuest(token);
            if (cached) {
              payload = { user: cached.user, prasad: cached.prasad };
              usedCache = true;
            } else {
              setErrorMsg(live.message || "User not found");
              setShowQrScannerEntry(false);
              return;
            }
          }
        } catch {
          const cached = await getCachedGuest(token);
          if (cached) {
            payload = { user: cached.user, prasad: cached.prasad };
            usedCache = true;
          } else {
            setErrorMsg("Network error and no offline cache for this token.");
            setShowQrScannerEntry(false);
            return;
          }
        }

        setUserData(payload.user);
        setPrasadData(payload.prasad);
        setFromCache(usedCache);
        setShowQrScannerEntry(false);
        resolveGuestPhoto(payload.user, getDynamicFacePhotoUrl).then(setPhotoUrl);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const manualConfirmEntry = async (token) => {
    setIsProcessing(true);
    setErrorMsg("");

    if (prasadData?.entryGate) {
      setStatusBanner({ type: "warning", message: "Entry already recorded" });
      setIsProcessing(false);
      return;
    }

    await patchCachedStatus(token, { entryGate: true });

    try {
      const updateResponse = await apiFetch("/api/prasad/entry", {
        method: "POST",
        body: JSON.stringify({ token, entryGate: true }),
      });
      const updateResult = await updateResponse.json().catch(() => ({}));
      if (!updateResponse.ok || !updateResult.success) {
        setErrorMsg(updateResult.message || "Failed to update entry gate status");
        return;
      }
      setPrasadData((prev) => ({ ...(prev || {}), entryGate: true }));
      setStatusBanner({
        type: updateResult.alreadySet ? "warning" : "success",
        message: updateResult.alreadySet ? "Entry already recorded" : "✅ Entry recorded successfully",
      });
      autoResetTimerRef.current = setTimeout(reset, 2000);
    } catch {
      enqueueMutation({ type: "entry", token });
      setStatusBanner({
        type: "offline",
        message: "🌐 Saved offline — will sync when network returns",
      });
      autoResetTimerRef.current = setTimeout(reset, 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Auto Check-in Toggle Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-slate-700">Entry Gate Check-In</span>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-purple-800">
          <input
            type="checkbox"
            checked={autoCheckIn}
            onChange={(e) => setAutoCheckIn(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500"
          />
          <span>Fast Auto-Check-in</span>
        </label>
      </div>

      {showQrScannerEntry && (
        <div>
          <div className="relative overflow-hidden rounded-xl bg-slate-900 shadow">
            <QrReader
              delay={300}
              onError={() => setErrorMsg("Camera access error. Check permissions.")}
              onScan={handleScan}
              style={{ width: "100%" }}
              constraints={{ video: { facingMode: "environment" } }}
            />
            <div className="absolute bottom-2 inset-x-0 text-center">
              <span className="bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                {isProcessing ? "Verifying badge…" : "Align QR Code within frame"}
              </span>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualTokenInput.trim()) {
                handleScan({ text: manualTokenInput.trim() });
                setManualTokenInput("");
              }
            }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              placeholder="⌨️ Enter Test Token (e.g. 24Dummy001)"
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-600 bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition"
            >
              Simulate Scan
            </button>
          </form>
        </div>
      )}

      {!showQrScannerEntry && (
        <div className="space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          {statusBanner && (
            <div
              className={`p-3 rounded-xl font-bold text-sm text-center ${
                statusBanner.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : statusBanner.type === "warning"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : statusBanner.type === "offline"
                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusBanner.message}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-sm font-semibold text-center border border-rose-200">
              {errorMsg}
            </div>
          )}

          {fromCache && (
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-xs text-center border border-amber-200">
              ⚡ Verified via Offline Cache (No internet required)
            </div>
          )}

          {userData && (
            <>
              <div className="flex flex-col items-center pt-2">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Guest Photo"
                    loading="lazy"
                    decoding="async"
                    className="w-32 h-32 object-cover rounded-2xl shadow border-2 border-purple-200 bg-slate-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                    No Face Photo
                  </div>
                )}
                <div className="text-center mt-3">
                  <h3 className="font-bold text-lg text-slate-900">
                    {userData.name?.firstName} {userData.name?.lastName}
                  </h3>
                  <div className="inline-block bg-purple-50 text-purple-700 text-xs font-mono font-bold px-2 py-0.5 rounded mt-1">
                    Token: {scannedToken}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Phone: {userData.phoneNumber || "—"}</p>
                </div>
              </div>

              {!autoCheckIn && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition"
                    onClick={() => manualConfirmEntry(scannedToken)}
                  >
                    Confirm Entry
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                    onClick={reset}
                  >
                    Rescan
                  </button>
                </div>
              )}

              {autoCheckIn && (
                <button
                  type="button"
                  className="w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
                  onClick={reset}
                >
                  Scan Next Guest ➔
                </button>
              )}
            </>
          )}

          {!userData && (
            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition"
              onClick={reset}
            >
              Scan Next ➔
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EntryGateScanner;

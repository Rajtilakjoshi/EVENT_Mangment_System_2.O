import React, { useRef, useState } from "react";
import QrReader from "react-qr-scanner";
import { apiFetch, fastCheckin, scanGuest } from "../utils/apiUtils";
import { cacheGuest, getCachedGuest, patchCachedStatus } from "../utils/guestCache";
import { enqueueMutation } from "../utils/offlineQueue";
import { resolveGuestPhoto } from "../utils/photoCache";
import { getDynamicFacePhotoUrl } from "../utils/firebaseUtils";
import { playSuccessChime, playWarningChime } from "../utils/audioFeedback";

const QRScanner = ({ prasadType = "prasad1" }) => {
  const [showQrScanner, setShowQrScanner] = useState(true);
  const [userData, setUserData] = useState(null);
  const [scannedToken, setScannedToken] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [statusBanner, setStatusBanner] = useState(null); // { type: 'success'|'warning'|'error'|'offline', message: '' }
  const [fromCache, setFromCache] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const lastScanTimeRef = useRef(0);
  const autoResetTimerRef = useRef(null);

  const activePrasad = prasadType || "prasad1";
  const formattedGateName = activePrasad.replace(/^prasad(\d+)$/i, "Prasad $1");

  const resetState = () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    setShowQrScanner(true);
    setUserData(null);
    setScannedToken("");
    setIsProcessing(false);
    setStatusBanner(null);
    setErrorMsg("");
    setPhotoUrl("");
    setFromCache(false);
  };

  const handleScan = async (data) => {
    const now = Date.now();
    if (!data?.text || !showQrScanner || isProcessing) return;
    if (now - lastScanTimeRef.current < 1000) return;
    lastScanTimeRef.current = now;
    setIsProcessing(true);
    setErrorMsg("");
    setStatusBanner(null);
    const token = String(data.text).trim();
    setScannedToken(token);

    if (autoCheckIn) {
      // High-performance single-trip atomic checkin
      try {
        const result = await fastCheckin(token, prasadType);

        if (result.ok && result.success) {
          setShowQrScanner(false);
          setUserData(result.user);
          resolveGuestPhoto(result.user, getDynamicFacePhotoUrl).then(setPhotoUrl);
          await cacheGuest({ user: result.user, prasad: result.user?.status });

          if (result.alreadyClaimed) {
            playWarningChime();
            setStatusBanner({
              type: "warning",
              message: `⚠️ ALREADY GIVEN! (Guest has already received ${formattedGateName})`,
            });
          } else {
            playSuccessChime();
            setStatusBanner({
              type: "success",
              message: `✅ ${formattedGateName.toUpperCase()} APPROVED! Hand over Food / Prasad`,
            });
            autoResetTimerRef.current = setTimeout(resetState, 2000);
          }
          return;
        }

        if (result.status === 403 || result.code === "entry_required") {
          playWarningChime();
          setShowQrScanner(false);
          setUserData(result.user);
          resolveGuestPhoto(result.user, getDynamicFacePhotoUrl).then(setPhotoUrl);
          setStatusBanner({
            type: "error",
            message: "⛔ STOP: Guest has NOT passed Main Entry Gate yet! Please direct them to Gate 1 first.",
          });
          return;
        }

        if (result.status === 404) {
          playWarningChime();
          setShowQrScanner(false);
          setErrorMsg("❌ PASS NOT FOUND — Please send guest to Registration Help Desk.");
          return;
        }

        throw new Error(result.message || "Failed to mark meal");
      } catch (err) {
        // Offline-tolerant fallback
        const cached = await getCachedGuest(token);
        if (cached) {
          setShowQrScanner(false);
          setUserData(cached.user);
          setFromCache(true);
          resolveGuestPhoto(cached.user, getDynamicFacePhotoUrl).then(setPhotoUrl);

          if (!cached.prasad?.entryGate) {
            setStatusBanner({
              type: "error",
              message: "⛔ OFFLINE ALERT: Guest has not completed Entry Gate!",
            });
            return;
          }

          if (cached.prasad?.[prasadType]) {
            setStatusBanner({
              type: "warning",
              message: `⚠️ ALREADY COLLECTED (${formattedGateName} recorded locally)`,
            });
            return;
          }

          await patchCachedStatus(token, { [prasadType]: true });
          enqueueMutation({ type: "prasad", token, prasadType });
          setStatusBanner({
            type: "offline",
            message: `🌐 ${formattedGateName.toUpperCase()} RECORDED OFFLINE (Queued for sync)`,
          });
          autoResetTimerRef.current = setTimeout(resetState, 2500);
          return;
        }

        setShowQrScanner(false);
        setErrorMsg("Network timeout and no offline cache found for this badge.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Manual review mode
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
              setErrorMsg(live.message || "User not found for this QR code.");
              setShowQrScanner(false);
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
            setShowQrScanner(false);
            return;
          }
        }

        setUserData(payload.user);
        setFromCache(usedCache);
        setShowQrScanner(false);
        resolveGuestPhoto(payload.user, getDynamicFacePhotoUrl).then(setPhotoUrl);

        if (!payload.prasad?.entryGate) {
          setStatusBanner({
            type: "error",
            message: "⛔ Guest has not passed Main Entry Gate yet!",
          });
        } else if (payload.prasad?.[prasadType]) {
          setStatusBanner({
            type: "warning",
            message: `⚠️ ${formattedGateName} already given to this guest.`,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const manualConfirmPrasad = async (token) => {
    setIsProcessing(true);
    setErrorMsg("");

    await patchCachedStatus(token, { [prasadType]: true });

    try {
      const response = await apiFetch("/api/prasad/update", {
        method: "POST",
        body: JSON.stringify({ token, prasadType }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        setStatusBanner({
          type: result.alreadySet ? "warning" : "success",
          message: result.alreadySet
            ? `${formattedGateName} was already given`
            : `✅ ${formattedGateName} marked successfully`,
        });
        autoResetTimerRef.current = setTimeout(resetState, 2000);
      } else if (result.code === "entry_required") {
        setStatusBanner({
          type: "error",
          message: "⛔ Guest must pass Main Entry Gate first!",
        });
      } else {
        setErrorMsg(result.message || "Failed to update status.");
      }
    } catch {
      enqueueMutation({ type: "prasad", token, prasadType });
      setStatusBanner({
        type: "offline",
        message: "🌐 Saved offline — will sync when network returns.",
      });
      autoResetTimerRef.current = setTimeout(resetState, 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Auto Check-in Toggle Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-slate-700 capitalize">
          {formattedGateName} Station
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-purple-800">
          <input
            type="checkbox"
            checked={autoCheckIn}
            onChange={(e) => setAutoCheckIn(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500"
          />
          <span>Fast Auto-Serve</span>
        </label>
      </div>

      {showQrScanner && (
        <div>
          <div className="relative overflow-hidden rounded-xl bg-slate-900 shadow">
            <QrReader
              delay={300}
              onError={() => setErrorMsg("Camera access error. Check permissions.")}
              onScan={handleScan}
              style={{ width: "100%" }}
              constraints={{ video: { facingMode: "environment" } }}
            />
            <div className="absolute bottom-3 inset-x-0 text-center">
              <span className="bg-slate-900/90 text-white text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-md shadow">
                {isProcessing ? "Checking pass…" : `Point camera at QR Pass for ${formattedGateName}`}
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
              placeholder="Enter Pass Number if QR is damaged..."
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-purple-200 focus:outline-none focus:border-purple-600 bg-white shadow-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Check Pass
            </button>
          </form>
        </div>
      )}

      {!showQrScanner && (
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
              ⚡ Verified via Offline Cache
            </div>
          )}

          {userData && (
            <>
              <div className="flex flex-col items-center pt-2">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Guest"
                    loading="lazy"
                    decoding="async"
                    className="w-32 h-32 object-cover rounded-2xl shadow border-2 border-purple-200 bg-slate-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                    No Photo
                  </div>
                )}
                <div className="text-center mt-3">
                  <h3 className="font-extrabold text-xl text-purple-950">
                    {userData.name?.firstName} {userData.name?.lastName}
                  </h3>
                  <div className="inline-block bg-purple-100 text-purple-900 text-xs font-mono font-extrabold px-3 py-1 rounded-full mt-1 border border-purple-200">
                    Pass Number: {scannedToken}
                  </div>
                  <p className="text-xs font-bold text-gray-700 mt-1">Phone: {userData.phoneNumber || "—"}</p>
                </div>
              </div>

              {!autoCheckIn && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 transition shadow-md"
                    onClick={() => manualConfirmPrasad(scannedToken)}
                  >
                    Approve {formattedGateName}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold hover:bg-slate-50 transition"
                    onClick={resetState}
                  >
                    Cancel / Rescan
                  </button>
                </div>
              )}

              {autoCheckIn && (
                <button
                  type="button"
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm transition shadow-md"
                  onClick={resetState}
                >
                  Next Guest ➔
                </button>
              )}
            </>
          )}

          {!userData && (
            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-purple-700 hover:to-indigo-700 transition shadow-md"
              onClick={resetState}
            >
              Scan Next Pass ➔
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;

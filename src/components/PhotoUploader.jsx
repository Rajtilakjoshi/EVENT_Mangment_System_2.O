import React, { useState, useRef, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import QrReader from 'react-qr-scanner';
import { apiFetch } from '../utils/apiUtils';
import { uploadPhotoToS3 } from '../utils/s3Utils';
import { patchCachedStatus } from '../utils/guestCache';
import { setCachedPhotoUrl } from '../utils/photoCache';

const PhotoUploader = () => {
    // Mode state
    const [showQrScanner, setShowQrScanner] = useState(true);
    const [manualTokenInput, setManualTokenInput] = useState('');
    const [userData, setUserData] = useState(null);
    const [scannedToken, setScannedToken] = useState('');
    
    // Photo states
    const [facePhoto, setFacePhoto] = useState(null);
    const [docPhoto, setDocPhoto] = useState(null);
    
    // Active camera capture state: null | 'face' | 'doc'
    const [activeCameraTarget, setActiveCameraTarget] = useState(null);
    const [videoReady, setVideoReady] = useState(false);
    
    // Status states
    const [cameraError, setCameraError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    
    const videoRef = useRef(null);

    // Reset all state
    const resetAll = () => {
        setShowQrScanner(true);
        setUserData(null);
        setScannedToken('');
        setManualTokenInput('');
        setFacePhoto(null);
        setDocPhoto(null);
        setActiveCameraTarget(null);
        setCameraError("");
        setUploadError("");
        setUploading(false);
        setSuccessMsg("");
        setVideoReady(false);
    };

    // Lookup attendee by token
    const lookupAttendee = async (token) => {
        const cleanToken = String(token || "").trim();
        if (!cleanToken) return;
        setIsSearching(true);
        setUploadError("");
        setSuccessMsg("");

        try {
            const res = await apiFetch(`/api/user/token/${encodeURIComponent(cleanToken)}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success || !data.user) {
                setUploadError(data.message || `No attendee found with token: ${cleanToken}`);
                return;
            }

            setUserData(data.user);
            setScannedToken(cleanToken);
            setShowQrScanner(false);
            
            // Check existing photos in MongoDB
            const existingFace = data.user.photoUrl || data.user.photo || null;
            const existingDoc = data.user.documentUrl || data.user.document || null;
            if (existingFace) setFacePhoto(existingFace);
            if (existingDoc) setDocPhoto(existingDoc);

            // Seamless auto-flow: Automatically launch camera for Face Photo
            // If face is already present, target doc; otherwise start with face
            if (!existingFace) {
                setActiveCameraTarget('face');
            } else if (!existingDoc) {
                setActiveCameraTarget('doc');
            } else {
                setActiveCameraTarget(null);
            }
        } catch (err) {
            setUploadError(`Failed to fetch attendee: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle live QR scanner
    const handleQrScan = (data) => {
        if (!data?.text || !showQrScanner) return;
        lookupAttendee(data.text);
    };

    // Camera setup when activeCameraTarget is open
    useEffect(() => {
        let streamInstance = null;
        if (activeCameraTarget && !showQrScanner) {
            setVideoReady(false);
            setCameraError("");
            navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
                .then(stream => {
                    streamInstance = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    setCameraError("Camera access denied or unavailable. Please check camera permissions in your browser.");
                });
        }

        return () => {
            if (streamInstance) {
                streamInstance.getTracks().forEach(t => t.stop());
            }
        };
    }, [activeCameraTarget, showQrScanner]);

    // Handle loadedmetadata
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const handleLoaded = () => setVideoReady(true);
        video.addEventListener('loadedmetadata', handleLoaded);
        return () => video.removeEventListener('loadedmetadata', handleLoaded);
    }, [activeCameraTarget]);

    // Snap photo & KEEP CAMERA ON to proceed to next photo!
    const handleSnapPhoto = () => {
        if (!videoRef.current || !videoReady) {
            setCameraError("Camera is initializing. Please wait a moment.");
            return;
        }
        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageSrc = canvas.toDataURL('image/jpeg', 0.85);

            if (activeCameraTarget === 'face') {
                setFacePhoto(imageSrc);
                // USER REQUIREMENT: Keep camera ON and immediately switch to Document Photo!
                setActiveCameraTarget('doc');
                setCameraError("");
            } else if (activeCameraTarget === 'doc') {
                setDocPhoto(imageSrc);
                // Both are now captured! Finish and show review summary
                setActiveCameraTarget(null);
                setCameraError("");
            }
        } catch (e) {
            setCameraError("Failed to capture image. Please try again.");
        }
    };

    // Upload & Save to MongoDB
    const handleSaveToMongoDB = async () => {
        if (!facePhoto && !docPhoto) {
            setUploadError("Please capture at least one photo (Face Photo or Document ID) before saving.");
            return;
        }

        setUploading(true);
        setUploadError("");
        setSuccessMsg("");

        let finalFaceUrl = facePhoto || "";
        let finalDocUrl = docPhoto || "";

        try {
            // 1. Upload Face Photo directly to AWS S3 (prevents MongoDB Atlas 512MB overflow)
            if (facePhoto && facePhoto.startsWith("data:")) {
                try {
                    const blob1 = await fetch(facePhoto).then(r => r.blob());
                    const fName1 = `${scannedToken}_face_${Date.now()}.jpg`;
                    finalFaceUrl = await uploadPhotoToS3(blob1, scannedToken, fName1);
                } catch (s3Err) {
                    console.warn("AWS S3 photo upload notice, trying Firebase fallback:", s3Err);
                    try {
                        const blob1 = await fetch(facePhoto).then(r => r.blob());
                        const fName1 = `images/${scannedToken}_${userData?.name?.firstName || "guest"}_face.jpg`;
                        const sRef1 = ref(storage, fName1);
                        await uploadBytes(sRef1, blob1);
                        finalFaceUrl = await getDownloadURL(sRef1);
                    } catch (fbErr) {
                        console.warn("Storage fallback notice — saving local preview link:", fbErr);
                        finalFaceUrl = facePhoto;
                    }
                }
            }

            // 2. Upload Document Photo directly to AWS S3
            if (docPhoto && docPhoto.startsWith("data:")) {
                try {
                    const blob2 = await fetch(docPhoto).then(r => r.blob());
                    const fName2 = `${scannedToken}_doc_${Date.now()}.jpg`;
                    finalDocUrl = await uploadPhotoToS3(blob2, scannedToken, fName2);
                } catch (s3Err) {
                    console.warn("AWS S3 doc upload notice, trying Firebase fallback:", s3Err);
                    try {
                        const blob2 = await fetch(docPhoto).then(r => r.blob());
                        const fName2 = `images/${scannedToken}_${userData?.name?.firstName || "guest"}_doc.jpg`;
                        const sRef2 = ref(storage, fName2);
                        await uploadBytes(sRef2, blob2);
                        finalDocUrl = await getDownloadURL(sRef2);
                    } catch (fbErr) {
                        console.warn("Storage fallback notice — saving local doc preview link:", fbErr);
                        finalDocUrl = docPhoto;
                    }
                }
            }

            // Update attendee record directly in MongoDB Atlas!
            const res = await apiFetch("/api/user/update-photo-doc", {
                method: "POST",
                body: JSON.stringify({
                    token: scannedToken,
                    photo: finalFaceUrl,
                    document: finalDocUrl,
                }),
            });

            const result = await res.json().catch(() => ({}));
            if (!res.ok || !result.success) {
                throw new Error(result.message || "Failed to update MongoDB record.");
            }

            // Update in-memory caches so entry scanner displays it immediately
            if (finalFaceUrl) {
                setCachedPhotoUrl(scannedToken, finalFaceUrl);
                await patchCachedStatus(scannedToken, { photo: finalFaceUrl }).catch(() => {});
            }

            setSuccessMsg("🎉 Photos successfully saved to Attendee record in MongoDB!");
            setTimeout(() => {
                resetAll();
            }, 2500);
        } catch (err) {
            setUploadError(`Save failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* SCREEN 1: Scan or Search Attendee */}
            {showQrScanner && (
                <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 leading-relaxed">
                        <strong>📸 Step 1 of 2:</strong> Scan attendee badge QR code or type their token ID below to begin photo capture.
                    </div>

                    <div className="relative overflow-hidden rounded-xl bg-slate-900 shadow">
                        <QrReader
                            delay={300}
                            style={{ width: '100%' }}
                            onError={(err) => setCameraError(err?.message || "Camera access error")}
                            onScan={handleQrScan}
                            constraints={{ video: { facingMode: "environment" } }}
                        />
                        <div className="absolute bottom-2 inset-x-0 text-center">
                            <span className="bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                                Align Badge QR within frame
                            </span>
                        </div>
                    </div>

                    {/* Manual token search */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            lookupAttendee(manualTokenInput);
                        }}
                        className="flex gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Type Pass Number (e.g. 24A001)..."
                            value={manualTokenInput}
                            onChange={(e) => setManualTokenInput(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-purple-200 focus:outline-none focus:border-purple-600 bg-white shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={isSearching || !manualTokenInput.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs font-bold transition shadow-md"
                        >
                            {isSearching ? "Searching…" : "Find Pass"}
                        </button>
                    </form>

                    {cameraError && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{cameraError}</div>}
                    {uploadError && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{uploadError}</div>}
                </div>
            )}

            {/* SCREEN 2: Attendee Photo Workspace */}
            {!showQrScanner && userData && (
                <div className="space-y-4">
                    {/* Attendee Summary Bar */}
                    <div className="flex items-center justify-between p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                        <div>
                            <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                <span>{userData.name?.firstName} {userData.name?.middleName || ""} {userData.name?.lastName}</span>
                                <span className="bg-purple-200 text-purple-900 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">{scannedToken}</span>
                            </div>
                            <div className="text-[11px] font-bold text-gray-700 mt-0.5">Phone: {userData.phoneNumber || "No phone"} • Age: {userData.age || "N/A"}</div>
                        </div>
                    </div>

                    {/* CAMERA VIEWFINDER (SEAMLESS 2-STEP FLOW) */}
                    {activeCameraTarget && (
                        <div className="p-4 bg-slate-900 rounded-2xl shadow-xl text-center space-y-3 border-2 border-purple-500/50">
                            {/* Step Badge */}
                            <div className="flex items-center justify-between px-1">
                                <span className="bg-purple-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    {activeCameraTarget === 'face' ? 'Step 1 of 2: Face Photo (Chehra)' : 'Step 2 of 2: Document ID (Aadhaar/ID)'}
                                </span>
                                <span className="text-xs text-slate-300 font-medium">
                                    {activeCameraTarget === 'face' ? 'Center face inside circle' : 'Align ID card inside rectangle'}
                                </span>
                            </div>

                            <div className="relative rounded-xl overflow-hidden bg-black max-w-sm mx-auto aspect-video flex items-center justify-center shadow-inner">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                {/* Framing overlay */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    {activeCameraTarget === 'face' ? (
                                        <div className="w-36 h-48 border-4 border-emerald-400 border-dashed rounded-full shadow-lg opacity-90 animate-pulse" />
                                    ) : (
                                        <div className="w-56 h-36 border-4 border-emerald-400 border-dashed rounded-lg shadow-lg opacity-90 animate-pulse" />
                                    )}
                                </div>
                            </div>

                            {/* Snap Action Button */}
                            <div className="flex gap-2 justify-center pt-1">
                                <button
                                    type="button"
                                    onClick={handleSnapPhoto}
                                    disabled={!videoReady}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2"
                                >
                                    {videoReady ? (
                                        activeCameraTarget === 'face' ? (
                                            <span>📸 Snap Face Photo & Continue to Document ➔</span>
                                        ) : (
                                            <span>📸 Snap Document Photo & Finish</span>
                                        )
                                    ) : (
                                        <span>Camera Initializing…</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveCameraTarget(null)}
                                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition"
                                >
                                    Pause Camera
                                </button>
                            </div>
                        </div>
                    )}

                    {/* DUAL PHOTO CARDS: SIDE BY SIDE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* CARD 1: FACE PHOTO */}
                        <div className={`p-4 rounded-xl border-2 transition flex flex-col justify-between ${facePhoto ? 'border-emerald-300 bg-emerald-50/40' : 'border-purple-200 bg-white'}`}>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-xs text-purple-900 flex items-center gap-1">
                                        <span>👤 1. Face Photo</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${facePhoto ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {facePhoto ? '✅ Captured' : '⏳ Missing'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                                    Verified at Entry Gate and Dining counters.
                                </p>

                                {/* Preview Frame */}
                                <div className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mb-3 relative">
                                    {facePhoto ? (
                                        <img src={facePhoto} alt="Face" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-3 text-slate-400">
                                            <div className="text-3xl mb-1">👤</div>
                                            <span className="text-[11px]">No Face Photo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                {facePhoto ? (
                                    /* EXPANDED RED RETAKE BUTTON AS REQUESTED */
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFacePhoto(null);
                                            setActiveCameraTarget('face');
                                        }}
                                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                                    >
                                        <span>❌ Retake Face Photo</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveCameraTarget('face')}
                                        className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                                    >
                                        <span>📸 Open Camera for Face</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CARD 2: DOCUMENT PHOTO */}
                        <div className={`p-4 rounded-xl border-2 transition flex flex-col justify-between ${docPhoto ? 'border-emerald-300 bg-emerald-50/40' : 'border-purple-200 bg-white'}`}>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-xs text-purple-900 flex items-center gap-1">
                                        <span>📄 2. Document ID</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${docPhoto ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {docPhoto ? '✅ Captured' : '⏳ Missing'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                                    Aadhaar / Government ID for registration records.
                                </p>

                                {/* Preview Frame */}
                                <div className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mb-3 relative">
                                    {docPhoto ? (
                                        <img src={docPhoto} alt="Document" className="w-full h-full object-contain bg-slate-900" />
                                    ) : (
                                        <div className="text-center p-3 text-slate-400">
                                            <div className="text-3xl mb-1">📄</div>
                                            <span className="text-[11px]">No Document Photo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                {docPhoto ? (
                                    /* EXPANDED RED RETAKE BUTTON AS REQUESTED */
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocPhoto(null);
                                            setActiveCameraTarget('doc');
                                        }}
                                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                                    >
                                        <span>❌ Retake Document ID</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveCameraTarget('doc')}
                                        className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                                    >
                                        <span>📸 Open Camera for Document</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* STATUS ALERTS */}
                    {cameraError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                            {cameraError}
                        </div>
                    )}
                    {uploadError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                            {uploadError}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                            {successMsg}
                        </div>
                    )}

                    {/* SAVE ACTION BUTTON */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSaveToMongoDB}
                            disabled={uploading || (!facePhoto && !docPhoto)}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <span>⏳ Saving Photos to Cloud Storage…</span>
                            ) : (
                                <span>💾 Save Guest Photos</span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoUploader;

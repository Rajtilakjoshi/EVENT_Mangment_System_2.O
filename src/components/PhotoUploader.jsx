import React, { useState, useRef, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes } from "firebase/storage";
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';

const PhotoUploader = () => {
    const [showQrScanner, setShowQrScanner] = useState(true);
    const [userData, setUserData] = useState(null);
    const [scannedToken, setScannedToken] = useState('');
    const [facePhoto, setFacePhoto] = useState(null);
    const [docPhoto, setDocPhoto] = useState(null);
    const [cameraError, setCameraError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const videoRef = useRef(null);
    const [videoReady, setVideoReady] = useState(false);
    const [step, setStep] = useState('face'); // 'face' or 'doc'
    const [scanLocked, setScanLocked] = useState(false);

    // Reset all state
    const resetAll = () => {
        setShowQrScanner(true);
        setUserData(null);
        setScannedToken('');
        setFacePhoto(null);
        setDocPhoto(null);
        setCameraError("");
        setUploadError("");
        setUploading(false);
        setSuccessMsg("");
        setVideoReady(false);
        setStep('face');
        setScanLocked(false);
    };

    // Handle QR scan
    const handleScan = async (data) => {
        if (!data || scanLocked) return;
        setScanLocked(true);
        const token = data.text;
        setScannedToken(token);
        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/user/token/${token}`);
            if (!userResponse.ok) {
                setUploadError('Wrong QR code or no guest found with token number.');
                setTimeout(() => {
                    setUploadError("");
                    setScanLocked(false);
                }, 1500);
                return;
            }
            const userInfo = await userResponse.json();
            if (!userInfo.user) {
                setUploadError(`No guest found with token number: ${token}`);
                setTimeout(() => {
                    setUploadError("");
                    setScanLocked(false);
                }, 1500);
                return;
            }
            setUserData(userInfo.user || null);
            setShowQrScanner(false);
            setStep('face');
            setScanLocked(false);
        } catch (error) {
            setUploadError('Error fetching user: ' + error.message);
            setTimeout(() => {
                setUploadError("");
                setScanLocked(false);
            }, 1500);
        }
    };

    // Camera setup for capture
    useEffect(() => {
        if (!showQrScanner && userData) {
            setVideoReady(false);
            setCameraError("");
            navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    setCameraError("Camera access denied or not available. Please check browser permissions and device camera.");
                });
        }
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [showQrScanner, userData]);

    // Listen for video metadata
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const handleLoadedMetadata = () => setVideoReady(true);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [showQrScanner, userData, step]);

    // Capture photo
    const capturePhoto = () => {
        if (!videoRef.current || !videoReady) {
            setCameraError("Camera not ready. Please wait and try again.");
            return;
        }
        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageSrc = canvas.toDataURL('image/jpeg');
            if (step === 'face') {
                setFacePhoto(imageSrc);
                setStep('doc');
            } else {
                setDocPhoto(imageSrc);
            }
            setCameraError("");
        } catch (e) {
            setCameraError("Failed to capture photo. Please try again.");
            setShowQrScanner(true);
            setUserData(null);
            setStep('face');
        }
    };

    // Upload both photos
    const handleUpload = async () => {
        if (!facePhoto || !docPhoto || !userData || !scannedToken) {
            setUploadError("Both photos and user info are required.");
            return;
        }
        setUploading(true);
        setUploadError("");
        try {
            const blob1 = await fetch(facePhoto).then(res => res.blob());
            const fileName1 = `images/${scannedToken}_${userData.name.firstName}_${userData.name.lastName}_face.jpg`;
            const storageRef1 = ref(storage, fileName1);
            await uploadBytes(storageRef1, blob1);
            const blob2 = await fetch(docPhoto).then(res => res.blob());
            const fileName2 = `images/${scannedToken}_${userData.name.firstName}_${userData.name.lastName}_doc.jpg`;
            const storageRef2 = ref(storage, fileName2);
            await uploadBytes(storageRef2, blob2);
            setSuccessMsg("Photos uploaded successfully!");
            setTimeout(resetAll, 2000);
        } catch (error) {
            setUploadError("Error uploading photos: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    // UI rendering
    return (
        <div className="w-full max-w-lg mx-auto p-4">
            {showQrScanner ? (
                <div className="text-center">
                    <h2 className="text-lg font-bold mb-4 text-black">Scan QR Code</h2>
                    <div className="qr-reader-container relative">
                        <QrReader
                            delay={300}
                            style={{ width: '100%' }}
                            onError={setCameraError}
                            onScan={handleScan}
                            constraints={{ video: { facingMode: "environment" } }}
                        />
                        {/* Green box and scanning effect copied from EntryGate */}
                        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                            <div className="relative w-64 h-64 border-4 border-green-500">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                    {cameraError && <div className="text-red-600 font-bold mt-2">{cameraError}</div>}
                    {uploadError && <div className="text-red-600 font-bold mt-2">{uploadError}</div>}
                </div>
            ) : userData && (
                <div className="text-center">
                    <div className="mb-2 text-base font-semibold">Token: {userData.token}</div>
                    <div className="mb-4 text-base font-semibold">Name: {userData.name.firstName} {userData.name.lastName}</div>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="border border-gray-300 rounded mb-4"
                        style={{ width: '100%', maxWidth: 400 }}
                    />
                    <button
                        onClick={capturePhoto}
                        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
                        disabled={!videoReady || uploading || (step === 'doc' && !facePhoto)}
                    >
                        {videoReady ? (step === 'face' ? 'Capture Face Photo' : 'Capture Document Photo') : 'Camera Loading...'}
                    </button>
                    {facePhoto && (
                        <div className="mb-4">
                            <img src={facePhoto} alt="Face" className="w-48 h-48 object-cover border mb-2 mx-auto" />
                            <button className="mb-2 px-4 py-2 bg-yellow-600 text-white rounded" onClick={() => { setFacePhoto(null); setStep('face'); }}>Retake Face Photo</button>
                        </div>
                    )}
                    {docPhoto && (
                        <div className="mb-4">
                            <img src={docPhoto} alt="Document" className="w-48 h-48 object-cover border mb-2 mx-auto" />
                            <button className="mb-2 px-4 py-2 bg-yellow-600 text-white rounded" onClick={() => { setDocPhoto(null); setStep('doc'); }}>Retake Document Photo</button>
                        </div>
                    )}
                    <button
                        onClick={handleUpload}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                        disabled={!facePhoto || !docPhoto || uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload Both Photos'}
                    </button>
                    {successMsg && <div className="text-green-700 font-bold mt-2">{successMsg}</div>}
                    {uploadError && <div className="text-red-600 font-bold mt-2">{uploadError}</div>}
                    <button className="mt-2 px-4 py-2 bg-gray-400 text-white rounded" onClick={resetAll}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default PhotoUploader;

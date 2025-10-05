
import React, { useState, useEffect, useCallback, useRef } from 'react';
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';
import { getDynamicFacePhotoUrl } from '../utils/firebaseUtils';

// Spinner component (dotted style)
const DottedSpinner = () => (
    <div className="flex justify-center items-center my-4">
        <div className="flex space-x-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
        </div>
    </div>
);


const QRScannerEntryGate = () => {
    const [prasadData, setPrasadDataState] = useState(null);
    const [showQrScannerEntry, setShowQrScannerEntry] = useState(true);
    const [userData, setUserData] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [scannedToken, setScannedToken] = useState('');
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [photoUrl, setPhotoUrl] = useState("");



    // Debounce scan handler
    const lastScanTimeRef = useRef(0);

    const setPrasadData = useCallback((data) => {
        setPrasadDataState(data);
    }, []);

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => {
                setShowUserForm(false);
                setShowQrScannerEntry(true);
                setUserData(null);
                setPrasadData(null);
                setScannedToken("");
                setSuccessMsg("");
                setPhotoUrl("");
            }, 4000); // 4 seconds auto-close after success
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Remove auto-close after showing profile. Only reset after entry update (successMsg)

    const updateEntryGateStatus = async (scannedToken) => {
        setIsProcessing(true);
        setErrorMsg("");
        try {
            const updateResponse = await fetch(`${API_BASE_URL}/api/prasad/entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: scannedToken,
                    entryGate: true,
                }),
            });

            if (!updateResponse.ok) {
                setErrorMsg('Failed to update entry gate status');
                setIsProcessing(false);
                return;
            }



            const updateResult = await updateResponse.json();
            setSuccessMsg('Entry gate status updated successfully!');
            // Refresh prasadData after update
            const prasadResponse = await fetch(`${API_BASE_URL}/api/prasad/status?token=${scannedToken}`);
            if (prasadResponse.ok) {
                const prasadInfo = await prasadResponse.json();
                setPrasadData(prasadInfo);
            }
        } catch (error) {
            setErrorMsg('An error occurred while updating the entry gate status. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleScan = async (data) => {
        const now = Date.now();
        if (!data || isProcessing) return;
        if (now - lastScanTimeRef.current < 1000) return; // 1s debounce
        lastScanTimeRef.current = now;
        setIsProcessing(true);
        setErrorMsg("");
        const scannedToken = data.text;
        setScannedToken(scannedToken);
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/token/${scannedToken}`);
            if (!response.ok) {
                setErrorMsg('Wrong QR code or no guest found with token number.');
                setTimeout(() => setErrorMsg(""), 2000);
                setIsProcessing(false);
                return;
            }
            const userInfo = await response.json();
            if (!userInfo.user) {
                setErrorMsg(`No guest found with token number: ${scannedToken}`);
                setTimeout(() => setErrorMsg(""), 2000);
                setIsProcessing(false);
                return;
            }
            setUserData(userInfo.user);

            // Generate dynamic photo URL
            try {
                const dynamicPhotoUrl = await getDynamicFacePhotoUrl(
                    userInfo.user.token,
                    userInfo.user.name.firstName,
                    userInfo.user.name.lastName
                );
                setPhotoUrl(dynamicPhotoUrl || '');
            } catch (error) {
                console.error('Error generating photo URL:', error);
                setPhotoUrl('');
            }

            // Fetch prasad status using the same token
            const prasadResponse = await fetch(`${API_BASE_URL}/api/prasad/status?token=${scannedToken}`);
            if (prasadResponse.status === 404) {
                setErrorMsg(`No prasad status found for token: ${scannedToken}`);
                setTimeout(() => setErrorMsg(""), 2000);
                setIsProcessing(false);
                return;
            }
            if (prasadResponse.status === 200) {
                const prasadInfo = await prasadResponse.json();
                setPrasadData(prasadInfo);
            }
            setShowUserForm(true);
            setShowQrScannerEntry(false);
        } catch (error) {
            setErrorMsg(`Error: ${error.message}`);
            setTimeout(() => setErrorMsg(""), 2000);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleError = (err) => {
        setErrorMsg("Camera error: " + err.message);
    };

    const getPhotoUrl = () => {
        // Use dynamically generated photo URL
        if (photoUrl) {
            return photoUrl;
        }
        
        // Fallback to constructed URL if dynamic URL generation failed
        if (!userData) return '';
        const bucket = 'divine-36910.firebasestorage.app';
        const fileName = `${userData.token}_${userData.name.firstName}_${userData.name.lastName}_face.jpg`;
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/images%2F${encodeURIComponent(fileName)}?alt=media`;
    };

    return (
        <div>
            {showQrScannerEntry && (
                <div>
                    <h2 className="text-lg font-bold mb-4 text-black">Scan QR Code</h2>
                    <div className="qr-reader-container relative">
                        <QrReader
                            delay={300}
                            style={{ width: '100%' }}
                            onError={handleError}
                            onScan={handleScan}
                            constraints={{
                                video: { facingMode: "environment" }
                            }}
                        />
                        {/* Square border and scanning effect */}
                        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                            <div className="relative w-64 h-64 border-4 border-green-500">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-scan"></div>
                            </div>
                        </div>
                        {/* Spinner overlay when processing */}
                        {isProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-50">
                            <DottedSpinner />
                          </div>
                        )}
                    </div>
                    {errorMsg && <div className="text-red-600 font-bold mt-2">{errorMsg}</div>}
                </div>
            )}

            {/* User Details Form */}
            {showUserForm && userData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
                    onClick={() => {
                        setShowUserForm(false);
                        setShowQrScannerEntry(true);
                        setUserData(null);
                        setPrasadData(null);
                        setScannedToken("");
                        setPhotoUrl("");
                    }}
                >
                    <div
                        className="w-full max-w-xs sm:max-w-sm md:max-w-md h-auto max-h-[500px] rounded-lg shadow-xl p-2 sm:p-4 flex flex-col items-center relative bg-white"
                        style={{ boxSizing: 'border-box', minHeight: '350px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold z-50 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-gray-200 hover:border-gray-300"
                            onClick={() => {
                                setShowUserForm(false);
                                setShowQrScannerEntry(true);
                                setUserData(null);
                                setPrasadData(null);
                                setScannedToken("");
                                setPhotoUrl("");
                            }}
                            title="Close"
                        >
                            ×
                        </button>
                        <h4 className="text-xl font-bold mb-3 text-black text-center">User Details</h4>
                        <img
                            src={getPhotoUrl()}
                            alt={`${userData?.name?.firstName || ''} ${userData?.name?.lastName || ''}`}
                            className="w-24 h-24 rounded-full object-cover mb-3 border-2 border-purple-400"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://ui-avatars.com/api/?name=No+Image';
                            }}
                        />
                        <form className="grid grid-cols-1 gap-3 w-full text-sm">
                                                        {/* Already scanned message (inline, no overlay) */}
                                                        {prasadData?.prasad?.entryGate === true && (
                                                                                            <div className="w-full flex justify-center items-center mb-1">
                                                                                                <span className="text-red-600 text-lg font-bold bg-transparent">Already scanned</span>
                                                                                            </div>
                                                        )}
                            {/* Full Name */}
                            <div className="flex flex-col mb-1">
                                <label className="font-bold text-black text-xs mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={[
                                        userData?.name?.firstName,
                                        userData?.name?.middleName,
                                        userData?.name?.lastName
                                    ].filter(Boolean).join(' ')}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full font-semibold"
                                />
                            </div>
                            {/* Age & Gender Row (horizontal scroll) */}
                            <div className="flex flex-row gap-3 mb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                                <div className="flex flex-col min-w-[120px]">
                                    <label className="font-bold text-black text-xs mb-1">Age</label>
                                    <input
                                        type="text"
                                        value={userData?.age || ''}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                                <div className="flex flex-col min-w-[120px]">
                                    <label className="font-bold text-black text-xs mb-1">Gender</label>
                                    <input
                                        type="text"
                                        value={userData?.gender || ''}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                            </div>
                            {/* Token & Phone Row (horizontal scroll) */}
                            <div className="flex flex-row gap-3 mb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                                <div className="flex flex-col min-w-[160px]">
                                    <label className="font-bold text-black text-xs mb-1">Token</label>
                                    <input
                                        type="text"
                                        value={userData?.token || ''}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                                <div className="flex flex-col min-w-[160px]">
                                    <label className="font-bold text-black text-xs mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={userData?.phoneNumber || ''}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                            </div>
                            {/* Entry Gate Pass (single field) */}
                            <div className="flex flex-col mb-1">
                                <label className="font-bold text-black text-xs mb-1">Entry Gate Pass</label>
                                <input
                                    type="text"
                                    value={prasadData?.prasad?.entryGate ? 'Allowed' : 'Not Allowed'}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                />
                            </div>
                            {/* Prasad Statuses Row (horizontal scroll) */}
                            <div className="flex flex-row gap-3 mb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                                <div className="flex flex-col min-w-[140px]">
                                    <label className="font-bold text-black text-xs mb-1">Prasad 1 Status</label>
                                    <input
                                        type="text"
                                        value={prasadData?.prasad?.prasad1 ? 'Collected' : 'Not Collected'}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                                <div className="flex flex-col min-w-[140px]">
                                    <label className="font-bold text-black text-xs mb-1">Prasad 2 Status</label>
                                    <input
                                        type="text"
                                        value={prasadData?.prasad?.prasad2 ? 'Collected' : 'Not Collected'}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                                <div className="flex flex-col min-w-[140px]">
                                    <label className="font-bold text-black text-xs mb-1">Prasad 3 Status</label>
                                    <input
                                        type="text"
                                        value={prasadData?.prasad?.prasad3 ? 'Collected' : 'Not Collected'}
                                        readOnly
                                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full"
                                    />
                                </div>
                            </div>
                        </form>
                        {prasadData?.prasad?.entryGate === true && (
                                                                                    null
                        )}
                                                {prasadData?.prasad?.entryGate !== true && (
                                                    <>
                                                        <button
                                                            onClick={() => updateEntryGateStatus(scannedToken)}
                                                            className="mt-3 px-4 py-2 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full text-sm"
                                                            disabled={isProcessing}
                                                        >
                                                            {isProcessing ? 'Updating...' : 'Confirm Entry Gate'}
                                                        </button>
                                                        {/* Spinner below button for update action */}
                                                        {isProcessing && <DottedSpinner />}
                                                    </>
                                                )}
                        {successMsg && <div className="text-green-700 font-bold mt-2 text-sm">{successMsg}</div>}
                                                {/* Bottom Close Button (always visible at bottom) */}
                                                <div className="w-full flex justify-center mt-8 mb-2 sticky bottom-0 z-40">
                                                    <button
                                                        onClick={() => {
                                                            setShowUserForm(false);
                                                            setShowQrScannerEntry(true);
                                                            setUserData(null);
                                                            setPrasadData(null);
                                                            setScannedToken("");
                                                            setPhotoUrl("");
                                                        }}
                                                        className="px-8 py-3 bg-gray-300 text-black font-bold text-lg border border-gray-400"
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                    </div>
                </div>
            )}



        </div>
    );
}
export default QRScannerEntryGate;

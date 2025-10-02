import React, { useState, useEffect, useCallback } from 'react';
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';
import { getDynamicFacePhotoUrl } from '../utils/firebaseUtils';


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
        if (data && !isProcessing) {
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
                                            className="w-full max-w-2xl h-full max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-4 flex flex-col items-center relative"
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
                                console.log('Image failed to load:', e.target.src);
                                // If the image fails to load, try to refresh the page or show a placeholder
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                            }}
                        />
                        <div className="w-full max-w-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">First Name</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.name?.firstName || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Middle Name</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.name?.middleName || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Last Name</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.name?.lastName || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Token</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm font-mono">{userData?.token || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Gender</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.gender || 'Not specified'}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Age</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.age || ''}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Email</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm break-all">{userData?.email || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Phone Number</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.phoneNumber || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Alternate Phone</label>
                                        <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm">{userData?.alternatePhoneNumber || ''}</div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 text-xs mb-1">Entry Gate Status</label>
                                        <div className={`border rounded px-3 py-2 text-sm font-semibold ${
                                            prasadData?.prasad?.entryGate 
                                                ? 'bg-green-50 border-green-300 text-green-700' 
                                                : 'bg-red-50 border-red-300 text-red-700'
                                        }`}>
                                            {prasadData?.prasad?.entryGate ? 'Allowed' : 'Not Allowed'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {prasadData?.prasad?.entryGate === true && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                                <p className="text-red-500 text-lg font-bold mb-4">User already allowed entry!</p>
                            </div>
                        )}
                        {prasadData?.prasad?.entryGate !== true && (
                            <button
                                onClick={() => updateEntryGateStatus(scannedToken)}
                                className="mt-3 px-4 py-2 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full text-sm"
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Updating...' : 'Confirm Entry Gate'}
                            </button>
                        )}
                        {successMsg && <div className="text-green-700 font-bold mt-2 text-sm">{successMsg}</div>}
                    </div>
                </div>
            )}


        </div>
    );
};

export default QRScannerEntryGate;

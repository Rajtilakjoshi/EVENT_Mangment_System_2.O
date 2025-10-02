import React, { useState, useEffect, useCallback } from 'react';
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';


const QRScannerEntryGate = () => {
    const [prasadData, setPrasadDataState] = useState(null);
    const [showQrScannerEntry, setShowQrScannerEntry] = useState(true);
    const [userData, setUserData] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [scannedToken, setScannedToken] = useState('');
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);



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
            }, 1500);
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

    const getPhotoUrl = (photoUrl) => {
    // Dynamically construct Firebase Storage public URL for profile image
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
                                    }}
                                >
                                        <div
                                            className="w-full max-w-4xl h-full max-h-[95vh] overflow-y-auto bg-white rounded-lg shadow-xl p-8 flex flex-col items-center"
                                            onClick={e => e.stopPropagation()}
                                        >
                        <h4 className="text-2xl font-bold mb-6 text-black text-center">User Details</h4>
                        <img
                            src={getPhotoUrl()}
                            alt={`${userData?.name?.firstName || ''} ${userData?.name?.lastName || ''}`}
                            className="w-48 h-48 rounded-full object-cover mb-6 border-4 border-purple-400"
                            style={{maxWidth: '30vw', maxHeight: '30vw'}}
                        />
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-base mb-1">First Name:</label>
                                <input type="text" value={userData?.name?.firstName || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Middle Name:</label>
                                <input type="text" value={userData?.name?.middleName || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Last Name:</label>
                                <input type="text" value={userData?.name?.lastName || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Token:</label>
                                <input type="text" value={userData?.token || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Gender:</label>
                                <input type="text" value={userData?.gender || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Age:</label>
                                <input type="text" value={userData?.age || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-base mb-1">Email:</label>
                                <input type="text" value={userData?.email || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Phone Number:</label>
                                <input type="text" value={userData?.phoneNumber || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Alternate Phone Number:</label>
                                <input type="text" value={userData?.alternatePhoneNumber || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                                <label className="font-bold text-black text-base mb-1">Entry Gate Pass</label>
                                <input type="text" value={prasadData?.prasad?.entryGate || ''} readOnly className="border border-purple-400 rounded px-2 py-1 bg-white text-black text-lg w-full box-border mb-2" />
                            </div>
                        </form>
                        {prasadData?.prasad?.entryGate === true && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                                <p className="text-red-500 text-lg font-bold mb-4">User already allowed entry!</p>
                            </div>
                        )}
                        {prasadData?.prasad?.entryGate !== true && (
                            <button
                                onClick={() => updateEntryGateStatus(scannedToken)}
                                className="mt-4 px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full"
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Updating...' : 'Confirm and Update Entry Gate Status'}
                            </button>
                        )}
                        {successMsg && <div className="text-green-700 font-bold mt-2">{successMsg}</div>}
                    </div>
                </div>
            )}


        </div>
    );
};

export default QRScannerEntryGate;

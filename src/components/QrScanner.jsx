import React, { useState, useEffect } from 'react';
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';


const QRScanner = ({ prasadType }) => {
    const [showQrScanner, setShowQrScanner] = useState(true);
    const [userData, setUserData] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [scannedToken, setScannedToken] = useState('');
    const [prasadData, setPrasadData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [alreadyTaken, setAlreadyTaken] = useState(false);
    const [entryGateError, setEntryGateError] = useState(false);


    const checkPrasadStatus = (prasadInfo) => {
        if (!prasadInfo || !prasadInfo.prasad) return false;
        return prasadInfo.prasad[prasadType] || false;
    };

    const handleScan = async (data) => {
        if (!data || !showQrScanner || isProcessing) return;

        setIsProcessing(true);
        const scannedToken = data.text;
        setScannedToken(scannedToken);
        setUserData(null);
        setPrasadData(null);
        setAlreadyTaken(false);

        try {
            const [userResponse, prasadResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/user/token/${scannedToken}`),
                fetch(`${API_BASE_URL}/api/prasad/status?token=${scannedToken}`)
            ]);

            let userInfo = null;
            let prasadInfo = null;

            if (userResponse.ok) {
                userInfo = await userResponse.json();
            }
            if (prasadResponse.ok) {
                prasadInfo = await prasadResponse.json();
            }

            if (!userInfo || userInfo.success === false || !userInfo.user) {
                setUserData(null);
                setShowUserForm(true);
                setShowQrScanner(false);
                setIsProcessing(false);
                return;
            }

            setUserData(userInfo.user);
            setShowUserForm(true);
            setShowQrScanner(false);
            setPrasadData(prasadInfo);
            if (checkPrasadStatus(prasadInfo)) {
                setAlreadyTaken(true);
            }
            setIsProcessing(false);
        } catch (error) {
            setUserData(null);
            setShowUserForm(true);
            setShowQrScanner(false);
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (showUserForm && alreadyTaken) {
            const timer = setTimeout(() => {
                setShowUserForm(false);
                setShowQrScanner(true);
                setUserData(null);
                setPrasadData(null);
                setScannedToken('');
                setAlreadyTaken(false);
            }, 5000); // Increased from 3000 to 5000 ms
            return () => clearTimeout(timer);
        }
    }, [showUserForm, alreadyTaken]);

    const resetState = () => {
        setShowUserForm(false);
        setShowQrScanner(true);
        setUserData(null);
        setPrasadData(null);
        setScannedToken('');
        setAlreadyTaken(false);
    };

    const updatePrasadStatus = async (token, prasadType) => {
        if (!prasadData?.prasad?.entryGate) {
            setEntryGateError(true);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/prasad/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, prasadType }),
            });
            if (!response.ok) {
                return;
            }
            resetState();
        } catch (error) {
        }
    };

    // photoUrl is now a public Firebase Storage URL
    const getPhotoUrl = (photoUrl) => photoUrl;
    const handleError = (err) => { console.error(err); };
    const keepQrRunning = () => { setShowQrScanner(true); };

    return (
        <div>
            {showQrScanner && (
                <div className="text-center">
                    <h2 className="text-lg font-bold mb-4 text-black">Scan QR Code</h2>
                    <div className="qr-reader-container relative">
                        <QrReader
                            delay={300}
                            style={{ width: '100%' }}
                            onError={handleError}
                            onScan={handleScan}
                            constraints={{ video: { facingMode: "environment" } }}
                        />
                        {/* Green box and scanning effect as in PhotoUploader */}
                        <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
                            <div className="relative w-64 h-64 border-4 border-green-500">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showUserForm && (
                userData && userData.name ? (
                    <div className="relative border-2 border-gray-200 p-4 rounded-lg bg-white w-full max-w-2xl mx-auto my-5 shadow-md flex flex-col flex-wrap items-center sm:items-stretch">
                        <h4 className="text-lg font-bold mb-4 text-black">User Details</h4>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="flex flex-col mb-2">
                                <div className="flex justify-center mb-3">
                                    <img
                                        src={getPhotoUrl(userData?.photoUrl)}
                                        alt={`${userData?.name?.firstName || ''} ${userData?.name?.lastName || ''}`}
                                        className="w-30 h-30 rounded-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">First Name:</label>
                                <input
                                    type="text"
                                    value={userData?.name?.firstName || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Middle Name:</label>
                                <input
                                    type="text"
                                    value={userData?.name?.middleName || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Last Name:</label>
                                <input
                                    type="text"
                                    value={userData?.name?.lastName || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Token:</label>
                                <input
                                    type="text"
                                    value={userData?.token || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Gender:</label>
                                <input
                                    type="text"
                                    value={userData?.gender || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Age:</label>
                                <input
                                    type="text"
                                    value={userData?.age || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Email:</label>
                                <input
                                    type="text"
                                    value={userData?.email || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Phone Number:</label>
                                <input
                                    type="text"
                                    value={userData?.phoneNumber || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Alternate Phone Number:</label>
                                <input
                                    type="text"
                                    value={userData?.alternatePhoneNumber || ''}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Entry Gate Pass</label>
                                <input
                                    type="text"
                                    value={prasadData?.prasad?.entryGate ? "allowed" : "allow"}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Prasad 1 Status</label>
                                <input
                                    type="text"
                                    value={prasadData?.prasad?.prasad1 ? "collected" : "not collected"}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div> 
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Prasad 2 Status</label>
                                <input
                                    type="text"
                                    value={prasadData?.prasad?.prasad2 ? "collected" : "not collected"}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                            <div className="flex flex-col mb-2">
                                <label className="font-bold text-black text-sm mb-1">Prasad 3 Status</label>
                                <input
                                    type="text"
                                    value={prasadData?.prasad?.prasad3? "collected" : "not collected"}
                                    readOnly
                                    className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
                                />
                            </div>
                        </form>
                        {/* Overlay for already taken prasad, like EntryGate */}
                        {alreadyTaken && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-20">
                                <p className="text-red-500 text-lg font-bold mb-4">User already taken {prasadType}!</p>
                                <button
                                    onClick={() => {
                                        setShowUserForm(false);
                                        setShowQrScanner(true);
                                        setUserData(null);
                                        setPrasadData(null);
                                        setScannedToken("");
                                        setAlreadyTaken(false);
                                    }}
                                    className="px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400"
                                >
                                    Reopen Scanner
                                </button>
                            </div>
                        )}
                        {/* Overlay for entry gate error */}
                        {entryGateError && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-30">
                                <p className="text-red-500 text-lg font-bold mb-4">Not done scanning at entry gate!</p>
                                <button
                                    onClick={() => {
                                        setEntryGateError(false);
                                        setShowUserForm(false);
                                        setShowQrScanner(true);
                                        setUserData(null);
                                        setPrasadData(null);
                                        setScannedToken("");
                                        setAlreadyTaken(false);
                                    }}
                                    className="px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400"
                                >
                                    Reopen Scanner
                                </button>
                            </div>
                        )}
                        {/* Show message if entry gate scan is required */}
                        {prasadData && prasadData.prasad && !prasadData.prasad.entryGate && (
                            <div className="text-red-500 font-bold mb-2 text-center">Entry gate scan required before prasad!</div>
                        )}
                        {/* ...existing code for update button, only if not alreadyTaken... */}
                        {!alreadyTaken && (
                            <button
                                onClick={() => updatePrasadStatus(scannedToken, prasadType)}
                                className="mt-4 px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full"
                                disabled={prasadData?.prasad?.[prasadType] === true || !prasadData?.prasad?.entryGate}
                            >
                                {prasadData?.prasad?.[prasadType] === true ? 'Already Collected' : 'Confirm and Update Prasad Status'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="border-2 border-red-400 p-4 rounded-lg bg-white w-full max-w-md mx-auto my-5 shadow-md flex flex-col items-center">
                        <h4 className="text-lg font-bold mb-4 text-red-600">Guest not found</h4>
                        <button
                            onClick={resetState}
                            className="mt-4 px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full"
                        >
                            Scan Again
                        </button>
                    </div>
                )
            )}
        </div>
    );
};

export default QRScanner;


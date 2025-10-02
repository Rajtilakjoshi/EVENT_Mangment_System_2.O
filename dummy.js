
import React, { useState } from 'react';
import QrReader from 'react-qr-scanner';


const QRScanner = ({ prasadType }) => {
    const [showQrScanner, setShowQrScanner] = useState(true);
    const [userData, setUserData] = useState(null); // State to hold user data
    const [showUserForm, setShowUserForm] = useState(false); // State to control form visibility
    const [scannedToken, setScannedToken] = useState('');
    const [prasadData, setPrasadData] = useState(null);

    const updatePrasadStatus = async (scannedToken, prasadType) => {
        const confirmUpdate = window.confirm(`Do you want to update the prasad status for ${prasadType}?`);
        if (confirmUpdate) {
            // Prepare data for the update
            try {
                const updateResponse = await fetch('https://api.jalnaasthamashibir.in/api/prasad/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: scannedToken,
                        prasadType: prasadType,
                    }),
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update prasad status');
                }

                const updateResult = await updateResponse.json();
                keepQrRunning();
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while updating the prasad status. Please try again.');
            }
        }
    };

    const handleScan = async (data) => {
        if (data) {
            const scannedToken = data.text; // Extract the token from the QR code
            setScannedToken(scannedToken); // Set the scanned token in state

            try {
                // Fetch user information using the scanned token
                const userResponse = await fetch(`https://api.jalnaasthamashibir.in/api/user/token/${scannedToken}`);
                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user info');
                }

                const userInfo = await userResponse.json();
                setUserData(userInfo); // Set the user data

                // Fetch prasad status using the same token
                const prasadResponse = await fetch(`https://api.jalnaasthamashibir.in/api/prasad/status?token=${scannedToken}`);
                if (!prasadResponse.ok) {
                    throw new Error('Failed to fetch prasad status');
                }

                if (prasadResponse.status === 200) {
                    const prasadInfo = await prasadResponse.json();
                    setPrasadData(prasadInfo);
                }

                setShowUserForm(true);
                
            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                setShowQrScanner(false); // Close the scanner
            }
        }
    };

    const getPhotoUrl = (photoUrl) => {
        const baseUrl = "https://api.jalnaasthamashibir.in/";
        return `${baseUrl}${photoUrl}`;
    };


    const handleError = (err) => {
        console.error(err);
    };

    const keepQrRunning = () => {
        setShowQrScanner(true);
    };

    
    
    return (
        <div>
            {showQrScanner && (
                <div>
                    <h2 className="text-lg font-bold mb-4 text-black">Scan QR Code</h2>
                    <QrReader
                        delay={300}
                        style={{ width: '100%' }}
                        onError={handleError}
                        onScan={handleScan}
                    // constraints={{
                    //     video: {
                    //         facingMode: { exact: "environment" }, // Back camera only
                    //     }
                    // }}
                    />
                </div>
            )}
         
            {showUserForm && userData && (
                <div className="border-2 border-gray-200 p-4 rounded-lg bg-white w-full max-w-md mx-auto my-5 shadow-md">
                    <h4 className="text-lg font-bold mb-4 text-black">User Details</h4>
                    <form className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col mb-2">
                            <div className="flex justify-center mb-3">
                                <img
                                    src={getPhotoUrl(userData.photoUrl)}
                                    alt={`${userData.name.firstName} ${userData.name.lastName}`}
                                    className="w-30 h-30 rounded-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">First Name:</label>
                            <input
                                type="text"
                                value={userData.name.firstName}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Middle Name:</label>
                            <input
                                type="text"
                                value={userData.name.middleName}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Last Name:</label>
                            <input
                                type="text"
                                value={userData.name.lastName}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Token:</label>
                            <input
                                type="text"
                                value={userData.token}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Gender:</label>
                            <input
                                type="text"
                                value={userData.gender}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Age:</label>
                            <input
                                type="text"
                                value={userData.age}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Email:</label>
                            <input
                                type="text"
                                value={userData.email}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Phone Number:</label>
                            <input
                                type="text"
                                value={userData.phoneNumber}
                                readOnly
                                className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"

                            />
                        </div>
                        <div className="flex flex-col mb-2">
                            <label className="font-bold text-black text-sm mb-1">Alternate Phone Number:</label>
                            <input
                                type="text"
                                value={userData.alternatePhoneNumber}
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
                    </form>

                    <button
                        onClick={() => {
                            updatePrasadStatus(scannedToken, prasadType);
                            setShowUserForm(false);
                        }}
                        className="mt-4 px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full"
                    >
                        Confirm and Update Prasad Status
                    </button>
                </div>
            )}
        </div>
    );
};

export default QRScanner;


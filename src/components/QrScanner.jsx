import React, { useState, useRef } from 'react';
import QrReader from 'react-qr-scanner';
import { API_BASE_URL } from '../utils/apiUtils';
import { getDynamicFacePhotoUrl } from '../utils/firebaseUtils';

const QRScanner = ({ prasadType }) => {
  const [showQrScanner, setShowQrScanner] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [scannedToken, setScannedToken] = useState('');
  const [prasadData, setPrasadData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [entryGateError, setEntryGateError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Debounce scan handler
  const lastScanTimeRef = useRef(0);

  const checkPrasadStatus = (prasadInfo) => {
    if (!prasadInfo || !prasadInfo.prasad) return false;
    return prasadInfo.prasad[prasadType] || false;
  };

  const handleScan = async (data) => {
    const now = Date.now();
    if (!data || !showQrScanner || isProcessing) return;
    if (now - lastScanTimeRef.current < 1000) return; // 1s debounce
    lastScanTimeRef.current = now;
    setIsProcessing(true);
    setErrorMsg("");
    setScannedToken(data.text);
    setUserData(null);
    setPrasadData(null);
    setAlreadyTaken(false);
    try {
      // Fetch user and prasad info
      const [userResponse, prasadResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/user/token/${data.text}`),
        fetch(`${API_BASE_URL}/api/prasad/status?token=${data.text}`)
      ]);
      let userInfo = null;
      let prasadInfo = null;
      if (userResponse.ok) userInfo = await userResponse.json();
      if (prasadResponse.ok) prasadInfo = await prasadResponse.json();
      if (!userInfo || userInfo.success === false || !userInfo.user) {
        setUserData(null);
        setShowUserForm(true);
        setShowQrScanner(false);
        setModalOpen(true);
        setErrorMsg("User not found for this QR code.");
        setIsProcessing(false);
        return;
      }
      setUserData(userInfo.user);
      // Try to get photo, fallback to blank if not found
      try {
        const dynamicPhotoUrl = await getDynamicFacePhotoUrl(
          userInfo.user.token,
          userInfo.user.name.firstName,
          userInfo.user.name.lastName
        );
        setPhotoUrl(dynamicPhotoUrl || '');
      } catch (error) {
        setPhotoUrl('');
      }
      setShowUserForm(true);
      setShowQrScanner(false);
      setModalOpen(true);
      setPrasadData(prasadInfo);
      if (checkPrasadStatus(prasadInfo)) setAlreadyTaken(true);
    } catch (error) {
      setUserData(null);
      setShowUserForm(true);
      setShowQrScanner(false);
      setModalOpen(true);
      setErrorMsg("Network or server error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setShowQrScanner(true);
    setUserData(null);
    setShowUserForm(false);
    setScannedToken('');
    setPrasadData(null);
    setIsProcessing(false);
    setAlreadyTaken(false);
    setEntryGateError(false);
    setModalOpen(false);
    setPhotoUrl("");
  };

  const updatePrasadStatus = async (token, prasadType) => {
    setErrorMsg("");
    setIsProcessing(true);
    if (!prasadData?.prasad?.entryGate) {
      setEntryGateError(true);
      setIsProcessing(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/prasad/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, prasadType })
      });
      const result = await response.json();
      if (result.success) {
        resetState();
      } else {
        setErrorMsg(result.message || 'Failed to update prasad status.');
      }
    } catch (err) {
      setErrorMsg('Network or server error while updating prasad status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (err) => {
    console.error('QR Reader Error:', err);
  };

  return (
    <div>
      {showQrScanner && (
        <div className="text-center">
          <h2 className="text-lg font-bold mb-4 text-black">Scan QR Code</h2>
          <div className="qr-reader-container relative">
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
                <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 border-purple-500 animate-spin"></div>
              </div>
            )}
            <QrReader
              delay={300}
              style={{ width: '100%' }}
              onError={handleError}
              onScan={handleScan}
              constraints={{ video: { facingMode: "environment" } }}
            />
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
              <div className="relative w-64 h-64 border-4 border-green-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-scan"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={resetState}>
          <div
            className={`w-full max-w-xs sm:max-w-sm md:max-w-md h-auto max-h-[500px] rounded-lg shadow-xl p-2 sm:p-4 flex flex-col items-center relative ${((alreadyTaken && prasadData?.prasad?.[prasadType]) || entryGateError || (prasadData && prasadData.prasad && !prasadData.prasad.entryGate)) ? 'bg-red-100' : 'bg-white'}`}
            style={{ boxSizing: 'border-box', minHeight: '350px' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold z-50 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-gray-200 hover:border-gray-300"
              onClick={resetState}
              title="Close"
              disabled={isProcessing}
            >
              ×
            </button>
            {userData && userData.name ? (
              <>
                <h4 className="text-xl font-bold mb-3 text-black text-center">User Details</h4>
                <div className="flex justify-center mb-3">
                  <img
                    src={photoUrl || userData.photo || userData.photoUrl || 'https://ui-avatars.com/api/?name=No+Image'}
                    alt={`${userData?.name?.firstName || ''} ${userData?.name?.lastName || ''}`}
                    className="w-24 h-24 rounded-full object-cover border-2 border-purple-400"
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = 'https://ui-avatars.com/api/?name=No+Image';
                    }}
                  />
                </div>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-sm">
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

                  {/* Status Fields */}
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
                {/* Overlays */}
                {(alreadyTaken && prasadData?.prasad?.[prasadType]) && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center z-20">
                    <p className="text-red-600 text-xl font-bold mb-4">Already scanned</p>
                  </div>
                )}
                {entryGateError && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center z-30">
                    <p className="text-red-600 text-xl font-bold mb-4">Not done scanning at entry gate!</p>
                  </div>
                )}
                {errorMsg && (
                  <div className="w-full text-center my-2">
                    <span className="text-red-500 font-semibold text-base">{errorMsg}</span>
                  </div>
                )}
                {prasadData && prasadData.prasad && !prasadData.prasad.entryGate && (
                  <div className="text-red-500 font-bold mb-2 text-center">
                    Entry gate scan required before prasad!
                  </div>
                )}
                {!alreadyTaken && (
                  <button
                    onClick={() => updatePrasadStatus(scannedToken, prasadType)}
                    className="mt-3 px-4 py-2 bg-purple-500 text-white font-semibold text-base w-full"
                    disabled={prasadData?.prasad?.[prasadType] === true || !prasadData?.prasad?.entryGate || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : (prasadData?.prasad?.[prasadType] === true
                      ? 'Already Collected'
                      : `Confirm ${prasadType}`)}
                  </button>
                )}
                {/* Bottom Close Button (always visible at bottom) */}
                <div className="w-full flex justify-center mt-8 mb-2 sticky bottom-0 z-40">
                  <button
                    onClick={resetState}
                    className="px-8 py-3 bg-gray-300 text-black font-bold text-lg border border-gray-400"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-lg font-bold mb-3 text-red-600 text-center">Guest not found</h4>
                <button
                  onClick={resetState}
                  className="mt-3 px-4 py-2 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full text-sm"
                >
                  Scan Again
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;

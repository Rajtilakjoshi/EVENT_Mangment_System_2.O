import React, { useState, useEffect } from 'react';
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

      if (userResponse.ok) userInfo = await userResponse.json();
      if (prasadResponse.ok) prasadInfo = await prasadResponse.json();

      if (!userInfo || userInfo.success === false || !userInfo.user) {
        setUserData(null);
        setShowUserForm(true);
        setShowQrScanner(false);
        setModalOpen(true);
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
      
      setShowUserForm(true);
      setShowQrScanner(false);
      setModalOpen(true);
      setPrasadData(prasadInfo);
      if (checkPrasadStatus(prasadInfo)) setAlreadyTaken(true);
      setIsProcessing(false);
    } catch (error) {
      setUserData(null);
      setShowUserForm(true);
      setShowQrScanner(false);
      setModalOpen(true);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (showUserForm && alreadyTaken) {
      const timer = setTimeout(() => {
        resetState();
      }, 4000); // 4 seconds auto-close
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
    setEntryGateError(false);
    setModalOpen(false);
    setPhotoUrl('');
  };

  const updatePrasadStatus = async (token, prasadType) => {
    if (!prasadData?.prasad?.entryGate) {
      setEntryGateError(true);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/prasad/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, prasadType }),
      });
      if (response.ok) resetState();
    } catch (error) {}
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
  const handleError = (err) => console.error(err);

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
              constraints={{ video: { facingMode: 'environment' } }}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={resetState}
        >
          <div
            className="w-full max-w-2xl h-full max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-4 flex flex-col items-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold z-50 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-gray-200 hover:border-gray-300"
              onClick={resetState}
              title="Close"
            >
              ×
            </button>

            {userData && userData.name ? (
              <>
                <h4 className="text-xl font-bold mb-3 text-black text-center">User Details</h4>
                <div className="flex justify-center mb-3">
                  <img
                    src={getPhotoUrl()}
                    alt={`${userData?.name?.firstName || ''} ${userData?.name?.lastName || ''}`}
                    className="w-24 h-24 rounded-full object-cover border-2 border-purple-400"
                    onError={(e) => {
                        console.log('Image failed to load:', e.target.src);
                        // If the image fails to load, show a placeholder
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-sm">

                  {/* Name Fields */}
                  {['firstName', 'middleName', 'lastName'].map((field, idx) => (
                    <div key={idx} className="flex flex-col mb-1">
                      <label className="font-bold text-black text-xs mb-1">
                        {field.replace(/([A-Z])/, ' $1').trim()}:
                      </label>
                      <input
                        type="text"
                        value={userData?.name?.[field] || ''}
                        readOnly
                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-sm w-full"
                      />
                    </div>
                  ))}

                  {/* Other Fields */}
                  {[
                    ['Token', userData?.token],
                    ['Gender', userData?.gender],
                    ['Age', userData?.age],
                    ['Email', userData?.email],
                    ['Phone Number', userData?.phoneNumber],
                    ['Alternate Phone Number', userData?.alternatePhoneNumber],
                    ['Entry Gate Pass', prasadData?.prasad?.entryGate ? 'Allowed' : 'Not Allowed'],
                    ['Prasad 1 Status', prasadData?.prasad?.prasad1 ? 'Collected' : 'Not Collected'],
                    ['Prasad 2 Status', prasadData?.prasad?.prasad2 ? 'Collected' : 'Not Collected'],
                    ['Prasad 3 Status', prasadData?.prasad?.prasad3 ? 'Collected' : 'Not Collected'],
                  ].map(([label, value], idx) => (
                    <div key={idx} className="flex flex-col mb-1">
                      <label className="font-bold text-black text-xs mb-1">{label}</label>
                      <input
                        type="text"
                        value={value || ''}
                        readOnly
                        className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-sm w-full"
                      />
                    </div>
                  ))}
                </form>

                {/* Overlays */}
                {alreadyTaken && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-20">
                    <p className="text-red-500 text-lg font-bold mb-4">User already taken {prasadType}!</p>
                  </div>
                )}
                {entryGateError && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-30">
                    <p className="text-red-500 text-lg font-bold mb-4">Not done scanning at entry gate!</p>
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
                    className="mt-3 px-4 py-2 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full text-sm"
                    disabled={prasadData?.prasad?.[prasadType] === true || !prasadData?.prasad?.entryGate}
                  >
                    {prasadData?.prasad?.[prasadType] === true
                      ? 'Already Collected'
                      : `Confirm ${prasadType}`}
                  </button>
                )}
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

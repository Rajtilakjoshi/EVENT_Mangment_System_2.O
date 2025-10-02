import React, { useState } from "react";
import { FaCamera, FaQrcode, FaCoffee, FaSearch, FaUserPlus, FaSync } from 'react-icons/fa';
import NewEntryForm from './NewEntryForm';
import TokenFinder from '../TokenFinder';
import QrScannerComponent from '../QrScanner';
import EntryGateScanner from '../EntryGate';
import PhotoUploader from '../PhotoUploader';
import { updateSheet } from "../../utils/apiUtils";

const dashboardButtons = [
  [
    { icon: FaCamera, label: 'Photo Uploader', action: 'toggleCamera' },
    { icon: FaQrcode, label: 'QR Scanner - Entry Gate', action: 'entryGate' }
  ],
  [
    { icon: FaCoffee, label: 'QR Scanner - Prasad 1', action: 'scanPrasad1' },
    { icon: FaCoffee, label: 'QR Scanner - Prasad 2', action: 'scanPrasad2' }
  ],
  [
    { icon: FaCoffee, label: 'QR Scanner - Prasad 3', action: 'scanPrasad3' },
    { icon: FaSearch, label: 'Token Finder', action: 'showTokenFinder' }
  ],
  [
    { icon: FaUserPlus, label: 'New Entry', action: 'showNewEntryForm' },
    { icon: FaSync, label: 'Update Sheet', action: 'updateSheet' }
  ]
];

const ModalWrapper = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center" onClick={onClose}>
      <div className="relative mx-auto p-6 border-0 w-11/12 max-w-lg shadow-2xl rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-purple-800 mb-4">{title}</h2>
        {children}
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const Homepage = () => {
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [showTokenFinder, setShowTokenFinder] = useState(false);
  const [showQrScannerComponent, setShowQrScannerComponent] = useState(false);
  const [prasadType, setPrasadType] = useState(null);
  const [showEntryGateScanner, setShowEntryGateScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleButtonClick =async (action) => {
    if (action === 'toggleCamera') {
      setShowCamera(true);
    } else if (action === 'showNewEntryForm') {
      setShowNewEntryForm(true);
    } else if (action.startsWith('scanPrasad')) {
      setPrasadType(action.replace('scan', '').toLowerCase());
      setShowQrScannerComponent(true);
    } else if (action === 'showTokenFinder') {
      setShowTokenFinder(true);
    } else if (action === 'entryGate') {
      setShowEntryGateScanner(true);
    }else if (action === 'updateSheet') {
      // Use the utility function for API call
      const result = await updateSheet();
      setUpdateStatus(result.message);
    }
  };


  return (
    <div className="volunteer-dashboard bg-gradient-to-b from-purple-100 to-white min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-purple-800 mb-10">Volunteer Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
        {dashboardButtons.flat().map((button, index) => (
          <button
            key={index}
            className="w-full dashboard-button bg-white hover:bg-purple-50 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => handleButtonClick(button.action)}
          >
            <button.icon className="text-3xl sm:text-4xl md:text-5xl text-purple-600 mb-2 sm:mb-4" />
            <span className="text-xs sm:text-sm md:text-base font-semibold text-purple-800 text-center">
              {button.label}
            </span>
          </button>
        ))}
      </div>

      {updateStatus && (
        <div className="mt-4 text-center text-lg font-semibold text-purple-700">
          {updateStatus}
        </div>
      )}

      <ModalWrapper isOpen={showEntryGateScanner} onClose={() => setShowEntryGateScanner(false)} title="Entry Gate Scanner">
        <EntryGateScanner setShowEntryGateScanner={setShowEntryGateScanner} />
      </ModalWrapper>

      <ModalWrapper isOpen={showQrScannerComponent} onClose={() => setShowQrScannerComponent(false)} title={`QR Scanner - ${prasadType}`}>
        <QrScannerComponent prasadType={prasadType} setShowQrScannerComponent={setShowQrScannerComponent} />
      </ModalWrapper>

      <ModalWrapper isOpen={showTokenFinder} onClose={() => setShowTokenFinder(false)} title="Token Finder">
        <TokenFinder onClose={() => setShowTokenFinder(false)} />
      </ModalWrapper>

      <ModalWrapper isOpen={showNewEntryForm} onClose={() => setShowNewEntryForm(false)} title="New Entry Form">
        <NewEntryForm />
      </ModalWrapper>

      <ModalWrapper isOpen={showCamera} onClose={() => setShowCamera(false)} title="Photo Uploader">
        <PhotoUploader />
      </ModalWrapper>


    </div>
  );
};

export default Homepage;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaQrcode, FaCoffee, FaSearch, FaSync, FaChartBar } from 'react-icons/fa';
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
    { icon: FaSync, label: 'Sync Google Sheet', action: 'updateSheet' },
    { icon: FaChartBar, label: 'Admin Live Monitor', action: 'adminMonitor' }
  ]
];

const ModalWrapper = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/70 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative mx-auto p-6 border border-purple-100 w-11/12 max-w-2xl shadow-2xl rounded-2xl bg-white/95 backdrop-blur-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-purple-800 mb-4">{title}</h2>
        {children}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 bg-purple-50 hover:bg-purple-100 rounded-full p-1.5 transition"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const Homepage = () => {
  const navigate = useNavigate();
  const [showTokenFinder, setShowTokenFinder] = useState(false);
  const [showQrScannerComponent, setShowQrScannerComponent] = useState(false);
  const [prasadType, setPrasadType] = useState('prasad1');
  const [showEntryGateScanner, setShowEntryGateScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleButtonClick = async (action) => {
    if (action === 'toggleCamera') {
      setShowCamera(true);
    } else if (action.startsWith('scanPrasad')) {
      setPrasadType(action.replace('scan', '').toLowerCase());
      setShowQrScannerComponent(true);
    } else if (action === 'showTokenFinder') {
      setShowTokenFinder(true);
    } else if (action === 'entryGate') {
      setShowEntryGateScanner(true);
    } else if (action === 'adminMonitor') {
      navigate('/admin');
    } else if (action === 'updateSheet') {
      setUpdateStatus('Syncing Mongo → Google Sheets…');
      const result = await updateSheet();
      setUpdateStatus(result.message);
    }
  };

  return (
    <div className="volunteer-dashboard bg-gradient-to-b from-purple-100 via-purple-50 to-white min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-purple-800 mb-10">Volunteer Dashboard</h1>
      
      {/* Grid with Purple Glass Theme Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
        {dashboardButtons.flat().map((button) => (
          <button
            key={button.action}
            className="w-full dashboard-button backdrop-blur-xl bg-white/70 hover:bg-white/90 border border-white/80 hover:border-purple-300/80 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 shadow-lg shadow-purple-900/5 hover:shadow-xl hover:shadow-purple-500/15 transform hover:scale-105 active:scale-95 group"
            onClick={() => handleButtonClick(button.action)}
          >
            <div className="p-3 rounded-2xl bg-purple-100/60 group-hover:bg-purple-200/60 text-purple-600 mb-2 sm:mb-4 transition-colors">
              <button.icon className="text-3xl sm:text-4xl md:text-5xl" />
            </div>
            <span className="text-xs sm:text-sm md:text-base font-semibold text-purple-900 text-center">
              {button.label}
            </span>
          </button>
        ))}
      </div>

      {updateStatus && (
        <div className="mt-6 text-center text-sm md:text-base font-semibold text-purple-800 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-purple-200 shadow-sm">
          {updateStatus}
        </div>
      )}

      <ModalWrapper isOpen={showEntryGateScanner} onClose={() => setShowEntryGateScanner(false)} title="Entry Gate Scanner">
        <EntryGateScanner setShowEntryGateScanner={setShowEntryGateScanner} />
      </ModalWrapper>

      <ModalWrapper
        isOpen={showQrScannerComponent}
        onClose={() => setShowQrScannerComponent(false)}
        title={`QR Scanner - ${prasadType}`}
      >
        <QrScannerComponent prasadType={prasadType} setShowQrScannerComponent={setShowQrScannerComponent} />
      </ModalWrapper>

      <ModalWrapper isOpen={showTokenFinder} onClose={() => setShowTokenFinder(false)} title="Token Finder">
        <TokenFinder onClose={() => setShowTokenFinder(false)} />
      </ModalWrapper>

      <ModalWrapper isOpen={showCamera} onClose={() => setShowCamera(false)} title="Photo Uploader">
        <PhotoUploader />
      </ModalWrapper>
    </div>
  );
};

export default Homepage;

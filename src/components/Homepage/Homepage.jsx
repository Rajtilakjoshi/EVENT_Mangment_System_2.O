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
    { icon: FaCamera, label: 'Photo Uploader', sub: 'Take Face & ID Photos', action: 'toggleCamera' },
    { icon: FaQrcode, label: 'Main Entry Gate', sub: 'Scan Pass to Enter', action: 'entryGate' }
  ],
  [
    { icon: FaCoffee, label: 'Prasad 1', sub: 'Scan Pass for Counter 1', action: 'scanPrasad1' },
    { icon: FaCoffee, label: 'Prasad 2', sub: 'Scan Pass for Counter 2', action: 'scanPrasad2' }
  ],
  [
    { icon: FaCoffee, label: 'Prasad 3', sub: 'Scan Pass for Counter 3', action: 'scanPrasad3' },
    { icon: FaSearch, label: 'Search Guest Details', sub: 'Find by Name or Mobile No.', action: 'showTokenFinder' }
  ],
  [
    { icon: FaSync, label: 'Update Google Sheet', sub: 'Refresh All 6 Sheet Tabs', action: 'updateSheet' },
    { icon: FaChartBar, label: 'Admin Dashboard', sub: 'Reports, Batches & Passes', action: 'adminMonitor' }
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
      setUpdateStatus('Updating Google Spreadsheet tabs…');
      const result = await updateSheet();
      setUpdateStatus(result.message);
    }
  };

  return (
    <div className="volunteer-dashboard bg-gradient-to-b from-purple-100 via-purple-50 to-white min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-purple-950">Volunteer Gate & Scanner Station</h1>
        <p className="text-sm md:text-base font-bold text-purple-700 mt-1">Tap any option below to scan passes or take attendee photos</p>
      </div>
      
      {/* Grid with Purple Glass Theme Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-6xl">
        {dashboardButtons.flat().map((button) => (
          <button
            key={button.action}
            className="w-full dashboard-button backdrop-blur-xl bg-white/80 hover:bg-white border-2 border-purple-100 hover:border-purple-300 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 group"
            onClick={() => handleButtonClick(button.action)}
          >
            <div className="p-3 rounded-2xl bg-purple-100/80 group-hover:bg-purple-200 text-purple-700 mb-2 sm:mb-3 transition-colors">
              <button.icon className="text-3xl sm:text-4xl" />
            </div>
            <span className="text-xs sm:text-sm md:text-base font-extrabold text-purple-950 text-center">
              {button.label}
            </span>
            {button.sub && (
              <span className="text-[11px] font-bold text-purple-700 text-center mt-1">
                {button.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {updateStatus && (
        <div className="mt-6 text-center text-sm md:text-base font-bold text-purple-950 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-xl border-2 border-purple-300 shadow-md">
          {updateStatus}
        </div>
      )}

      <ModalWrapper isOpen={showEntryGateScanner} onClose={() => setShowEntryGateScanner(false)} title="Main Entry Gate Check-In">
        <EntryGateScanner setShowEntryGateScanner={setShowEntryGateScanner} />
      </ModalWrapper>

      <ModalWrapper
        isOpen={showQrScannerComponent}
        onClose={() => setShowQrScannerComponent(false)}
        title={`Prasad ${prasadType.replace('prasad', '')} Scanner`}
      >
        <QrScannerComponent prasadType={prasadType} setShowQrScannerComponent={setShowQrScannerComponent} />
      </ModalWrapper>

      <ModalWrapper isOpen={showTokenFinder} onClose={() => setShowTokenFinder(false)} title="Search Guest Pass & Details">
        <TokenFinder onClose={() => setShowTokenFinder(false)} />
      </ModalWrapper>

      <ModalWrapper isOpen={showCamera} onClose={() => setShowCamera(false)} title="Guest Photo Uploader">
        <PhotoUploader />
      </ModalWrapper>
    </div>
  );
};

export default Homepage;

import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/apiUtils';

const DEFAULT_ENDPOINTS = [
  {
    id: 'health',
    category: 'System Health',
    name: '1. Health Check',
    method: 'GET',
    path: '/api/health',
    description: 'Check backend service liveness, timestamp, and version.',
    defaultParams: {},
  },
  {
    id: 'stats',
    category: 'System Health',
    name: '2. Live Attendance Metrics',
    method: 'GET',
    path: '/api/stats',
    description: 'Get verified counts for Gate, Prasad 1/2/3, and rolling velocity.',
    defaultParams: {},
  },
  {
    id: 'token_series',
    category: 'System Health',
    name: '3. Pass Number Counter',
    method: 'GET',
    path: '/api/token-series',
    description: 'Get current last token registered, total count, and next series.',
    defaultParams: {},
  },
  {
    id: 'guests',
    category: 'Guests & Search',
    name: '4. List All Guests (Directory)',
    method: 'GET',
    path: '/api/guests',
    description: 'Fetch all attendees with check-in status, photos, and pass numbers.',
    defaultParams: {},
  },
  {
    id: 'search',
    category: 'Guests & Search',
    name: '5. Omni-Search Guests',
    method: 'GET',
    path: '/api/user/search?q={query}',
    description: 'Search attendee database by Name, Mobile Number, or Pass Number.',
    defaultParams: { query: 'Sharma' },
  },
  {
    id: 'scan',
    category: 'Scan & Verification',
    name: '6. Single Round-Trip Pass Scan',
    method: 'GET',
    path: '/api/scan/{token}',
    description: 'Simulates camera scanning an attendee QR pass code.',
    defaultParams: { token: '24A001' },
  },
  {
    id: 'checkin',
    category: 'Scan & Verification',
    name: '7. Main Gate Check-In (Atomic)',
    method: 'POST',
    path: '/api/checkin',
    description: 'Admit attendee through Main Gate or Prasad station.',
    defaultBody: JSON.stringify({ token: '24A001', gate: 'entry' }, null, 2),
  },
  {
    id: 'prasad_status',
    category: 'Prasad Counters',
    name: '8. Prasad Claim Status',
    method: 'GET',
    path: '/api/prasad/status?token={token}',
    description: 'Inspect which Prasad counters (1, 2, 3) an attendee has collected.',
    defaultParams: { token: '24A001' },
  },
  {
    id: 'prasad_update',
    category: 'Prasad Counters',
    name: '9. Collect Prasad (Claim Counter)',
    method: 'POST',
    path: '/api/prasad/update',
    description: 'Mark Prasad 1, Prasad 2, or Prasad 3 as collected.',
    defaultBody: JSON.stringify({ token: '24A001', prasadType: 'prasad1' }, null, 2),
  },
  {
    id: 'update_sheet',
    category: 'Cloud Storage & Sync',
    name: '10. Sync Google Sheets (6 Tabs)',
    method: 'POST',
    path: '/api/update-sheet',
    description: 'Trigger batch synchronization of all 6 Google Spreadsheet tabs.',
    defaultBody: '{}',
  },
  {
    id: 's3_photo',
    category: 'Cloud Storage & Sync',
    name: '11. Get AWS S3 Face Photo URL',
    method: 'GET',
    path: '/api/aws/s3/photo/{token}',
    description: 'Generate presigned high-speed CloudFront / S3 URL for guest photo.',
    defaultParams: { token: '24A001' },
  },
];

const ApiManualTestConsole = () => {
  const [targetBase, setTargetBase] = useState(
    API_BASE_URL || 'https://cxgpdserzc.us-east-1.awsapprunner.com'
  );
  const [selectedEndpoint, setSelectedEndpoint] = useState(DEFAULT_ENDPOINTS[0]);
  const [urlParams, setUrlParams] = useState(DEFAULT_ENDPOINTS[0].defaultParams || {});
  const [requestBody, setRequestBody] = useState(DEFAULT_ENDPOINTS[0].defaultBody || '');
  const [responseState, setResponseState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [smokeTestResults, setSmokeTestResults] = useState(null);
  const [smokeTesting, setSmokeTesting] = useState(false);

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setUrlParams(ep.defaultParams || {});
    setRequestBody(ep.defaultBody || '');
    setResponseState(null);
  };

  const constructUrl = () => {
    let resolved = selectedEndpoint.path;
    Object.entries(urlParams).forEach(([k, v]) => {
      resolved = resolved.replace(`{${k}}`, encodeURIComponent(v));
    });
    const base = targetBase.replace(/\/+$/, '');
    return `${base}${resolved}`;
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponseState(null);
    const url = constructUrl();
    const t0 = performance.now();

    try {
      const options = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (selectedEndpoint.method === 'POST') {
        options.body = requestBody || '{}';
      }

      const res = await fetch(url, options);
      const elapsed = Math.round(performance.now() - t0);
      const text = await res.text();
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(text);
      } catch (e) {
        parsedJson = text;
      }

      setResponseState({
        status: res.status,
        statusText: res.statusText,
        elapsedMs: elapsed,
        data: parsedJson,
        ok: res.ok,
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - t0);
      setResponseState({
        status: 0,
        statusText: 'Network / CORS Error',
        elapsedMs: elapsed,
        data: { error: err.message },
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const runAllSmokeTests = async () => {
    setSmokeTesting(true);
    setSmokeTestResults([]);
    const coreEndpoints = DEFAULT_ENDPOINTS.slice(0, 5);
    const results = [];

    for (const ep of coreEndpoints) {
      let resolved = ep.path;
      Object.entries(ep.defaultParams || {}).forEach(([k, v]) => {
        resolved = resolved.replace(`{${k}}`, encodeURIComponent(v));
      });
      const url = `${targetBase.replace(/\/+$/, '')}${resolved}`;
      const t0 = performance.now();
      try {
        const res = await fetch(url, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
        });
        const elapsed = Math.round(performance.now() - t0);
        results.push({
          name: ep.name,
          url,
          status: res.status,
          ok: res.ok,
          elapsed,
        });
      } catch (err) {
        results.push({
          name: ep.name,
          url,
          status: 'FAIL',
          ok: false,
          elapsed: Math.round(performance.now() - t0),
          error: err.message,
        });
      }
    }

    setSmokeTestResults(results);
    setSmokeTesting(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-5 md:p-8 max-w-6xl mx-auto my-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl md:text-3xl font-black text-purple-950">
              Manual API Testing Console
            </h1>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-extrabold border border-purple-200">
              Diagnostic Bench
            </span>
          </div>
          <p className="text-xs md:text-sm font-bold text-gray-600 mt-1">
            Test and verify all backend API routes live. Inspect response JSON, HTTP status codes, and network latency.
          </p>
        </div>

        <button
          type="button"
          onClick={runAllSmokeTests}
          disabled={smokeTesting}
          className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          <span>⚡</span>
          <span>{smokeTesting ? 'Running Smoke Tests…' : 'Run All Core Smoke Tests'}</span>
        </button>
      </div>

      {/* Target Server Switcher */}
      <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 my-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-xs font-black text-purple-950 uppercase tracking-wide whitespace-nowrap">
            Target Host:
          </span>
          <input
            type="text"
            value={targetBase}
            onChange={(e) => setTargetBase(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTargetBase('https://cxgpdserzc.us-east-1.awsapprunner.com')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border ${
              targetBase === 'https://cxgpdserzc.us-east-1.awsapprunner.com'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            ☁️ AWS App Runner (Production)
          </button>
          <button
            type="button"
            onClick={() => setTargetBase('http://localhost:5000')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border ${
              targetBase === 'http://localhost:5000'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            💻 Local (localhost:5000)
          </button>
        </div>
      </div>

      {/* Smoke Test Results Summary */}
      {smokeTestResults && (
        <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 animate-fadeIn">
          <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-2">
            Smoke Test Diagnostic Run:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {smokeTestResults.map((r, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-100">{r.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{r.url}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                    r.ok ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {r.status}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.elapsed}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoints Menu */}
        <div className="lg:col-span-5 space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-purple-950 mb-3">
            Select API Endpoint to Test:
          </h2>
          {DEFAULT_ENDPOINTS.map((ep) => {
            const isSelected = selectedEndpoint.id === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full text-left p-3 rounded-2xl transition border flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                    : 'bg-white text-purple-950 border-purple-100 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold">{ep.name}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-purple-200' : 'text-gray-500'}`}>
                    {ep.path}
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  isSelected
                    ? 'bg-purple-800 text-white'
                    : ep.method === 'GET'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-indigo-100 text-indigo-900'
                }`}>
                  {ep.method}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Endpoint Runner & Response */}
        <div className="lg:col-span-7 bg-slate-50 p-5 rounded-3xl border border-purple-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-200 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {selectedEndpoint.category}
                </span>
                <h3 className="text-base font-extrabold text-purple-950 mt-1">
                  {selectedEndpoint.name}
                </h3>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase ${
                selectedEndpoint.method === 'GET'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
              }`}>
                {selectedEndpoint.method}
              </span>
            </div>

            <p className="text-xs text-gray-600 font-bold mb-4">
              {selectedEndpoint.description}
            </p>

            {/* URL Display */}
            <div className="mb-4">
              <label className="block text-[11px] font-black text-purple-950 uppercase mb-1">
                Request Target URL:
              </label>
              <div className="p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-mono text-purple-950 break-all select-all">
                {constructUrl()}
              </div>
            </div>

            {/* URL Parameters Input (if any) */}
            {Object.keys(urlParams).length > 0 && (
              <div className="mb-4 space-y-2">
                <label className="block text-[11px] font-black text-purple-950 uppercase">
                  URL Parameters:
                </label>
                {Object.entries(urlParams).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 w-20">
                      {k}:
                    </span>
                    <input
                      type="text"
                      value={v}
                      onChange={(e) => setUrlParams({ ...urlParams, [k]: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Request Body (POST only) */}
            {selectedEndpoint.method === 'POST' && (
              <div className="mb-4">
                <label className="block text-[11px] font-black text-purple-950 uppercase mb-1">
                  JSON Request Body:
                </label>
                <textarea
                  rows={4}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Send Request Button */}
            <button
              type="button"
              onClick={executeRequest}
              disabled={loading}
              className="w-full py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sending Request…' : `Send ${selectedEndpoint.method} Request`}
            </button>
          </div>

          {/* Response Viewer */}
          <div className="mt-5 pt-4 border-t border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-purple-950">
                Response Output:
              </span>
              {responseState && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${
                    responseState.ok
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}>
                    HTTP {responseState.status} {responseState.statusText}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-500">
                    ⏱️ {responseState.elapsedMs}ms
                  </span>
                </div>
              )}
            </div>

            <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-56 select-all border border-slate-800">
              {responseState
                ? JSON.stringify(responseState.data, null, 2)
                : '// Press "Send Request" to view live JSON response…'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiManualTestConsole;

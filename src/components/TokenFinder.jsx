import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/apiUtils';

const TokenFinder = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchInputRef = useRef(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Universal Omni-Search Handler
  const handleSearch = useCallback(async (queryOverride) => {
    const q = String(queryOverride !== undefined ? queryOverride : searchTerm).trim();
    if (!q) {
      setResults([]);
      setHasSearched(false);
      setErrorMsg('');
      setSelectedUser(null);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);
    setSelectedUser(null);

    try {
      const res = await apiFetch(`/api/user/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Failed to search attendees');
        setResults([]);
        return;
      }

      const list = data.results || [];
      setResults(list);

      // If exactly 1 result returned, auto-select it for instant detail view
      if (list.length === 1) {
        setSelectedUser(list[0]);
      }
    } catch (err) {
      setErrorMsg(`Search failed: ${err.message}`);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-bold text-purple-900 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>🔍 Universal Attendee & Token Search</span>
          </span>
          <span className="text-[11px] text-purple-600 font-normal">
            Matches Name • Phone • Token • Email
          </span>
        </div>

        {/* Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by First/Last Name, Mobile Number, or Token ID…"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
            <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setResults([]);
                  setHasSearched(false);
                  setSelectedUser(null);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchTerm.trim()}
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            {isLoading ? <span>Searching…</span> : <span>Search</span>}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 pt-2.5 text-xs text-slate-500 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Quick examples:</span>
          {["Archana", "Khan", "9403201713", "24Dummy005"].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                setSearchTerm(pill);
                handleSearch(pill);
              }}
              className="px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md font-mono text-[11px] font-medium transition shadow-2xs"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {hasSearched && (
        <div className="space-y-3">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">
              {results.length === 0
                ? "No Attendees Found"
                : `Found ${results.length} Attendee${results.length > 1 ? "s" : ""}`}
            </span>
            {results.length > 0 && (
              <span className="text-[11px] text-purple-700 font-medium">
                Click any attendee card to view full profile
              </span>
            )}
          </div>

          {/* Empty State */}
          {results.length === 0 && !isLoading && (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <div className="text-3xl mb-2">🔍</div>
              <h4 className="text-xs font-bold text-slate-700">No match for "{searchTerm}"</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching with just their 10-digit mobile number, first name, or token number (e.g. 24Dummy001).
              </p>
            </div>
          )}

          {/* Multi-Result List Cards */}
          <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {results.map((guest) => {
              const isSelected = selectedUser?.token === guest.token;
              const fullName = `${guest.name?.firstName || ""} ${guest.name?.middleName || ""} ${guest.name?.lastName || ""}`.trim();

              return (
                <div
                  key={guest.token}
                  onClick={() => setSelectedUser(isSelected ? null : guest)}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-purple-600 bg-purple-50/50 shadow-md"
                      : "border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs"
                  }`}
                >
                  {/* Left: Avatar & Basic Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                      {guest.photoUrl ? (
                        <img src={guest.photoUrl} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-700 font-bold text-sm">
                          {guest.name?.firstName?.[0] || "👤"}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{fullName || "Unnamed Attendee"}</span>
                        {guest.gender && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({guest.gender}{guest.age ? `, ${guest.age}y` : ""})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                        <span>📞 {guest.phoneNumber || "No phone"}</span>
                        {guest.alternatePhoneNumber && guest.alternatePhoneNumber !== guest.phoneNumber && (
                          <span className="text-slate-400 text-[10px]">
                            • Alt: {guest.alternatePhoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Token Badge & Action */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status badges */}
                    <div className="flex gap-1 text-[10px]">
                      {guest.status?.entryGate ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Inside
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          Not entered
                        </span>
                      )}
                    </div>

                    {/* Clean Token Badge (Copy button removed as requested) */}
                    <span className="px-3 py-1 rounded-xl bg-purple-100 border border-purple-200 text-purple-900 font-mono font-bold text-xs shadow-2xs">
                      🏷️ {guest.token}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DETAILED ATTENDEE CARD (EXPANDED VIEW) */}
          {selectedUser && (
            <div className="mt-4 p-4 bg-white border border-purple-200 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <span>📋 Complete Profile — {selectedUser.token}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕ Close Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Full Name</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.name?.firstName} {selectedUser.name?.middleName || ""} {selectedUser.name?.lastName || ""}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Token ID</span>
                  <span className="font-mono font-bold text-purple-800">
                    {selectedUser.token}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Mobile Number</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.phoneNumber || "N/A"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Alternate Mobile</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.alternatePhoneNumber || "N/A"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Email</span>
                  <span className="font-medium text-slate-800 truncate block" title={selectedUser.email}>
                    {selectedUser.email || "N/A"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Gender / Age</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.gender || "N/A"} {selectedUser.age ? `• ${selectedUser.age} yrs` : ""}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Entry Gate</span>
                  <span className={`font-bold ${selectedUser.status?.entryGate ? "text-emerald-700" : "text-amber-700"}`}>
                    {selectedUser.status?.entryGate ? "✅ Checked In" : "⏳ Not Entered"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Meals (Prasad 1 / 2 / 3)</span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    P1: {selectedUser.status?.prasad1 ? "✓" : "—"} | P2: {selectedUser.status?.prasad2 ? "✓" : "—"} | P3: {selectedUser.status?.prasad3 ? "✓" : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(TokenFinder);

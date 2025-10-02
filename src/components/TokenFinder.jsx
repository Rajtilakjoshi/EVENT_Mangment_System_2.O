import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import './TokenFinder.css';
import { API_BASE_URL } from '../utils/apiUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

const TokenFinder = ({ onClose }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    };

    const handleResize = debounce(() => {
      setIsMobile(window.innerWidth <= 768);
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [firstName, setFirstName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  console.log(firstName, phoneNumber)
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setSearchResult(null); // Reset search result before new search
    try {
  console.log("[TokenFinder] Searching for:", firstName, phoneNumber);
  const response = await fetch(`${API_BASE_URL}/api/user/search?firstName=${firstName}&phoneNumber=${phoneNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setUserData(data);
      if (data.token) {
        setSearchResult({ token: data.token, firstName: data.name.firstName, lastName: data.name.lastName });
      } else {
        setSearchResult({ error: 'Token not found' });
      }
    } catch (error) {
      console.error('Error searching for token:', error);
      setSearchResult({ error: 'Failed to fetch token data' });
    } finally {
      setIsLoading(false);
    }
  }, [firstName, phoneNumber]);

  const getPhotoUrl = (photoUrl) => {
  return `${API_BASE_URL}/${photoUrl}`;
  };


  return (
    <div className="border-2 border-[rgb(174,107,224)] p-4 rounded-lg bg-white w-full max-w-md mx-auto my-5 shadow-md token-finder">
      <div className="token-finder__header">
        <h2 className="text-lg font-bold mb-4 text-black token-finder__title">Token Finder</h2>
        {isMobile && (
          <button
            onClick={onClose}

          >
            close
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 token-finder__search-container">
        <input
          type="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter First Name"
          className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border token-finder__input"
        />

        <input
          type="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter Mobile or Alternate Number"
          className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border token-finder__input"
        />

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="mt-4 px-5 py-3 bg-purple-500 text-white rounded transition-colors duration-300 hover:bg-purple-400 w-full token-finder__search-button"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      
      {searchResult && (
        <div className="mt-4">
          {searchResult.error ? (
            <p className="text-red-500">{searchResult.error}</p>
          ) : (
            <form className="grid grid-cols-2 gap-4">
              <h4 className="text-lg font-bold mb-4 text-black">User Details</h4>
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
              <button onClick={onClose} className="mt-4 px-5 py-3 bg-red-500 text-white rounded transition-colors duration-300 hover:bg-red-400">Close</button>
            </form>
          )}

        </div>
      )}
      {/* 
      {!isMobile && (
        <button onClick={onClose} className="token-finder__close-button mt-4 px-5 py-3 bg-red-500 text-white rounded transition-colors duration-300 hover:bg-red-400 w-half">
          Close
        </button>
      )} */}
    </div>
  );
};

export default React.memo(TokenFinder);

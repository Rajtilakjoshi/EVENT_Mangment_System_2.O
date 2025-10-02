import React from 'react';

const LazySearchResult = ({ result }) => {
  if (result.error) return <p className="token-finder__error">Error: {result.error}</p>;

  return (
    <div className="token-finder__search-result">
      <h3>Token: {result.token}</h3>
      <p><strong>Name:</strong> {`${result.name.firstName} ${result.name.middleName} ${result.name.lastName}`}</p>
      <p><strong>Gender:</strong> {result.gender}</p>
      <p><strong>Age:</strong> {result.age}</p>
      <p><strong>Email:</strong> {result.email}</p>
      <p><strong>Phone:</strong> {result.phoneNumber}</p>
      <p><strong>Alternate Phone:</strong> {result.alternatePhoneNumber}</p>
      {result.photoUrl && (
        <div className="token-finder__photo-container">
          <img loading="lazy" src={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000'}/${result.photoUrl}`} alt="User" className="token-finder__photo" />
        </div>
      )}
    </div>
  );
};

export default React.memo(LazySearchResult);
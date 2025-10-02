
import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/apiUtils';

const NewEntryForm = () => {
  const formRef = useRef(null);
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollTop = 0;
    }
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        token: formData.token,
        name: {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName
        },
        gender: formData.gender,
        age: parseInt(formData.age),
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        alternatePhoneNumber: formData.alternatePhoneNumber,
        photoUrl: formData.photoUrl || ""
      };
      console.log('[NewEntryForm] Submitting payload:', payload);
  const response = await fetch(`${API_BASE_URL}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[NewEntryForm] Backend error:', errorText);
        throw new Error('Failed to submit form');
      }
      // Reset form and show success message
      setFormData(initialState);
      alert('Form submitted successfully');
    } catch (error) {
      console.error('[NewEntryForm] Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    }
  };

  const initialState = {
    token: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    age: '',
    email: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    photoUrl: ""
  };

  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  return (
    <div
      ref={formRef}
      style={{
        maxHeight: '80vh',
        overflowY: 'auto',
        padding: '1rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      className="max-w-md mx-auto mt-8"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="token" className="block text-black text-sm font-bold mb-2">Token No</label>
          <input
            type="text"
            id="token"
            name="token"
            value={formData.token}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="firstName" className="block text-black text-sm font-bold mb-2">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="middleName" className="block text-black text-sm font-bold mb-2">Middle Name</label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="lastName" className="block text-black text-sm font-bold mb-2">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="gender" className="block text-black text-sm font-bold mb-2">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="age" className="block text-black text-sm font-bold mb-2">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block text-black text-sm font-bold mb-2">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="phoneNumber" className="block text-black text-sm font-bold mb-2">Phone Number</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="alternatePhoneNumber" className="block text-black text-sm font-bold mb-2">Alternate Phone Number</label>
          <input
            type="tel"
            id="alternatePhoneNumber"
            name="alternatePhoneNumber"
            value={formData.alternatePhoneNumber}
            onChange={handleChange}
            className="border border-[rgb(174,107,224)] rounded px-2 py-1 bg-white text-black text-base w-full box-border"
          />
        </div>
        {/* Add more fields here if needed, e.g., photoUrl */}
        <div className="flex items-center justify-between">
          <button type="submit" className="bg-purple-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewEntryForm;
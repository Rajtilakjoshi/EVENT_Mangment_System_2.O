import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    whatsappMobile: '',
    role: 'volunteer'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Registration successful! Admins will share your password soon.");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} className="px-3 py-2 border rounded" required />
            <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} className="px-3 py-2 border rounded" required />
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="px-3 py-2 border rounded md:col-span-2" required />
            <input name="mobile" placeholder="Mobile Number" value={form.mobile} onChange={handleChange} className="px-3 py-2 border rounded" required />
            <input name="whatsappMobile" placeholder="WhatsApp Mobile Number" value={form.whatsappMobile} onChange={handleChange} className="px-3 py-2 border rounded" required />
            <select name="role" value={form.role} onChange={handleChange} className="px-3 py-2 border rounded md:col-span-2">
              <option value="volunteer">Volunteer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <div className="text-red-500 mb-2 mt-2">{error}</div>}
          {success && <div className="text-green-600 mb-2 mt-2">{success}</div>}
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-500 mt-4" disabled={loading}>{loading ? 'Registering...' : 'Create Account'}</button>
        </form>
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:underline" onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    </div>
  );
};

export default Register;

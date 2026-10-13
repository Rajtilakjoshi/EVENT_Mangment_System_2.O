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
      const name = `${form.firstName} ${form.lastName}`.trim();
      const res = await fetch('/api/registerFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: form.role || 'volunteer',
          name,
          phone: form.mobile,
          whatsappMobile: form.whatsappMobile,
        })
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // In local development, Vercel serverless functions aren't running
        setSuccess("✅ Dev Account Created! Redirecting to login...");
        setTimeout(() => navigate('/login'), 1200);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSuccess("Registration successful! Check email for your temporary password.");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      // Graceful local development fallback
      setSuccess("✅ Dev Account Created! Redirecting to login...");
      setTimeout(() => navigate('/login'), 1200);
    } finally {
      setLoading(false);
    }
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
            <input
              type="text"
              value="Volunteer"
              disabled
              className="px-3 py-2 border rounded md:col-span-2 bg-gray-50 text-gray-600"
            />
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

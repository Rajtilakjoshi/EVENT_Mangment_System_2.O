import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// ...existing code...

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.needsPasswordReset) {
        setShowPasswordSetup(true);
      } else if (data.success) {
        navigate('/homepage');
      } else {
        setError(data.error || "Login failed.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword, confirmPassword: confirmNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        setShowPasswordSetup(false);
        setSuccess("Password set! You can now log in.");
      } else {
        setError(data.error || "Failed to set password.");
      }
    } catch (err) {
      setError("Failed to set password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {!showPasswordSetup ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded" required />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-500" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword}>
            <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded" required />
            <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded" required />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-500" disabled={loading}>{loading ? 'Setting...' : 'Set Password'}</button>
          </form>
        )}
        <div className="flex justify-between mt-4">
          <button className="text-blue-600 hover:underline" onClick={() => navigate('/register')}>Register</button>
        </div>
      </div>
    </div>
  );
};

export default Login;

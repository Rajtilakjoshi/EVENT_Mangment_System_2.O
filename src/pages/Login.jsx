import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
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
      const res = await fetch('/api/loginFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.firstLogin) {
        setShowPasswordSetup(true);
        setSuccess('Please set a new password for your first login.');
      } else if (data.success) {
        if (onLogin) onLogin();
        navigate('/homepage', { replace: true });
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
      const res = await fetch('/api/loginFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, newPassword })
      });
      const data = await res.json();
      if (data.success && data.reset) {
        setShowPasswordSetup(false);
        setSuccess('Password set! Please log in with your new password.');
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setError(data.error || 'Failed to set password.');
      }
    } catch (err) {
      setError(err.message || 'Failed to set password. Please try again.');
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
          <button className="text-blue-600 hover:underline" onClick={async () => {
            setError("");
            setSuccess("");
            setLoading(true);
            try {
              const res = await fetch('/api/loginFirestore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, forgot: true })
              });
              const data = await res.json();
              if (data.success) {
                setSuccess('Credentials sent to your email.');
              } else {
                setError(data.error || 'Failed to send credentials.');
              }
            } catch (err) {
              setError(err.message || 'Failed to send credentials.');
            }
            setLoading(false);
          }}>Forgot Password?</button>
        </div>
      </div>
    </div>
  );
};

export default Login;

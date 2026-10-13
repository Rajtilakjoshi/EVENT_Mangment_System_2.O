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
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/loginFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed. Please check credentials.');
        setLoading(false);
        return;
      }

      if (data.firstLogin) {
        setShowPasswordSetup(true);
        setSuccess('Please set a new password for your first login.');
      } else if (data.success) {
        if (onLogin) onLogin(data);
        navigate('/homepage', { replace: true });
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/loginFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
        setLoading(false);
        return;
      }

      if (data.success && data.reset) {
        setShowPasswordSetup(false);
        setSuccess('Password updated successfully! Please log in with your new password.');
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

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Please type your Email address above first, then click Forgot Password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/loginFirestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), forgot: true })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSuccess(data.message || 'Temporary credentials sent to your email.');
        if (data.tempPassword) {
          setPassword(data.tempPassword);
        }
      } else {
        setError(data.error || 'Failed to send reset password. Please verify your email.');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-100 via-purple-50 to-white p-4">
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-purple-100 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl font-black">
            DEH
          </div>
          <h2 className="text-2xl font-black text-purple-950">Volunteer Portal Login</h2>
          <p className="text-xs font-bold text-gray-500 mt-1">
            Divine Energy Hub 2026 — Official Check-In System
          </p>
        </div>

        {!showPasswordSetup ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-purple-950 uppercase tracking-wide mb-1">
                Volunteer Email
              </label>
              <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-purple-950 uppercase tracking-wide mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {error && (
              <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3 rounded-xl transition shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50 text-sm"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 font-bold mb-2">
              🔒 First-time login: Please set your new permanent password.
            </div>

            <div>
              <label className="block text-xs font-extrabold text-purple-950 uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-purple-950 uppercase tracking-wide mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Repeat password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {error && (
              <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3 rounded-xl transition shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50 text-sm"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Activate New Password'}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-100 text-xs font-bold">
          <button
            type="button"
            className="text-purple-700 hover:text-purple-950 transition"
            onClick={() => navigate('/register')}
          >
            Create Account
          </button>
          <button
            type="button"
            className="text-purple-700 hover:text-purple-950 transition"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-gray-200 text-center">
          <button
            type="button"
            onClick={() => navigate('/api-test')}
            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 underline"
          >
            🧪 Open Manual API Testing Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

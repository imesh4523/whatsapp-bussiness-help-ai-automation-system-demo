import React, { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { API_BASE_URL } from '../config';

function AdminAuth({ onSuccess }) {
  const [formData, setFormData] = useState({
    email: 'admin@whatsray.com',
    password: 'admin1234'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleAuthSuccess = (user, token) => {
    localStorage.setItem('aura_token', token);
    localStorage.setItem('aura_user', JSON.stringify(user));
    onSuccess({
      name: user.name || 'SYSTEM ADMIN',
      email: user.email,
      role: 'ADMIN'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user.email !== 'admin@whatsray.com' && data.user.plan !== 'Enterprise') {
          setError('Access denied: Admin only.');
          return;
        }
        handleAuthSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@whatsray.com', password: 'admin1234' })
      });
      const data = await res.json();
      if (res.ok) {
        handleAuthSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Quick Login failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f6f8] flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-md rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#00832e]"></span>
            <span className="font-black text-lg tracking-wider text-black">WhatsRay Admin</span>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">System Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight text-center mb-6">Sign In</h2>
          {error && <p className="text-red-500 text-xs text-center font-semibold">{error}</p>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
            <div className="relative">
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                placeholder="admin@whatsray.com"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Password</label>
            </div>
            <div className="relative">
              <input
                required
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-black text-white hover:bg-neutral-800 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-4"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleQuickLogin}
            className="w-full bg-[#00832e] text-white hover:bg-emerald-800 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Quick Admin Login
          </button>

          <p className="text-center text-[10px] text-gray-400 pt-4 border-t border-gray-100 mt-4">
            Security Notice: Authorization session attempts are logged for system audit.
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminAuth;

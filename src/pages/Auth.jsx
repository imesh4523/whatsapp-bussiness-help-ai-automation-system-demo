import React, { useState } from 'react';
import { X, Lock, Mail, User } from 'lucide-react';

function Auth({ type, onClose, onSwitchType, onSuccess }) {
  const [currentType, setCurrentType] = useState(type); // 'login', 'signup', 'forgot'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Form validation
    if (currentType === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    // Simulate API authorization requests
    // POST /api/auth/login or /api/auth/register
    setTimeout(() => {
      setLoading(false);
      if (currentType === 'login') {
        onSuccess({
          name: formData.email.split('@')[0].toUpperCase(),
          email: formData.email
        });
      } else if (currentType === 'signup') {
        onSuccess({
          name: formData.fullName,
          email: formData.email
        });
      } else {
        alert('Reset link has been sent to your email.');
        setCurrentType('login');
      }
    }, 1200);
  };

  const renderForm = () => {
    switch (currentType) {
      case 'login':
        return (
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
                  placeholder="name@email.com"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Password</label>
                <button 
                  type="button" 
                  onClick={() => setCurrentType('forgot')}
                  className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider transition-colors"
                >
                  Forgot?
                </button>
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
              className="w-full bg-black text-white hover:bg-neutral-800 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-2"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <p className="text-center text-xs text-gray-500 font-light pt-4 border-t border-gray-100">
              Don&apos;t have an account?{' '}
              <button 
                type="button" 
                onClick={() => setCurrentType('signup')} 
                className="text-black font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </form>
        );
      case 'signup':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight text-center mb-6">Create Account</h2>
            {error && <p className="text-red-500 text-xs text-center font-semibold">{error}</p>}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Full Name</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
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
                  placeholder="name@email.com"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Password</label>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Confirm Password</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
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
              className="w-full bg-black text-white hover:bg-neutral-800 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-2"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-xs text-gray-500 font-light pt-4 border-t border-gray-100">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => setCurrentType('login')} 
                className="text-black font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        );
      case 'forgot':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight text-center mb-2">Reset Password</h2>
            <p className="text-gray-400 font-light text-center text-xs pb-4">Enter your email address and we will send you a reset link.</p>
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
                  placeholder="name@email.com"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-black text-white hover:bg-neutral-800 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-2"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <p className="text-center text-xs text-gray-500 font-light pt-4 border-t border-gray-100">
              Back to{' '}
              <button 
                type="button" 
                onClick={() => setCurrentType('login')} 
                className="text-black font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Card container */}
      <div 
        className="relative bg-white w-full max-w-md rounded-3xl p-8 md:p-10 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {renderForm()}
      </div>
    </div>
  );
}

export default Auth;

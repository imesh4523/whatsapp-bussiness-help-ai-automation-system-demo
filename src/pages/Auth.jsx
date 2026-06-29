import React, { useState } from 'react';
import { X, Lock, Mail, User } from 'lucide-react';
import { API_BASE_URL } from '../config';


function Auth({ type, onClose, onSwitchType, onSuccess }) {
  const [currentType, setCurrentType] = useState(type === 'register' ? 'signup' : type); // 'login', 'signup', 'forgot'
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

    // Send authentication requests to backend Express server
    const endpoint = currentType === 'login' ? '/auth/login' : '/auth/register';
    const payload = currentType === 'login' 
      ? { email: formData.email, password: formData.password }
      : { email: formData.email, password: formData.password, fullName: formData.fullName };

    if (currentType === 'forgot') {
      fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to send reset link');
          }
          alert(data.message || 'Reset link has been sent to your email.');
          setCurrentType('login');
        })
        .catch((err) => {
          setError(err.message || 'An error occurred. Please try again.');
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    if (currentType === 'reset') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const email = params.get('email');
      
      if (!token || !email) {
        setError('Missing validation token or email. Please request a new reset link.');
        setLoading(false);
        return;
      }
      
      fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          token: token,
          password: formData.password
        })
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to reset password');
          }
          alert(data.message || 'Password reset successful! Please log in.');
          setCurrentType('login');
          window.history.pushState(null, '', '/');
        })
        .catch((err) => {
          setError(err.message || 'An error occurred. Please try again.');
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }
        onSuccess(data.user, data.token);
      })
      .catch((err) => {
        setError(err.message || 'An error occurred during authentication.');
      })
      .finally(() => {
        setLoading(false);
      });
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

            <div className="pt-4 flex flex-col items-center gap-3">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                OR USE YOUR SOCIAL ACCOUNT TO LOGIN
              </span>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/auth/google?redirect=${window.location.origin}`;
                }}
                className="w-full border border-gray-200 hover:bg-neutral-50 hover:border-gray-300 transition-all py-3 rounded-full flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
                  <g>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.91 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.02-10.36 7.02-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </g>
                </svg>
                <span className="text-xs font-semibold text-neutral-600">Sign in with Google</span>
              </button>
            </div>

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
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight text-center mb-3">Create Account</h2>
            {error && <p className="text-red-500 text-xs text-center font-semibold">{error}</p>}

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Full Name</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                  placeholder="name@email.com"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Password</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Confirm Password</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-black text-white hover:bg-neutral-800 transition-colors py-3 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-1.5"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="pt-2 flex flex-col items-center gap-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                OR USE YOUR SOCIAL ACCOUNT TO REGISTER
              </span>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/auth/google?redirect=${window.location.origin}`;
                }}
                className="w-full border border-gray-200 hover:bg-neutral-50 hover:border-gray-300 transition-all py-2 rounded-full flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
                  <g>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.91 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.02-10.36 7.02-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </g>
                </svg>
                <span className="text-xs font-semibold text-neutral-600">Sign up with Google</span>
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 font-light pt-3 border-t border-gray-100 mb-1">
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
      case 'reset':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight text-center mb-2">Set New Password</h2>
            <p className="text-gray-400 font-light text-center text-xs pb-4">Enter your new password below to reset it.</p>
            {error && <p className="text-red-500 text-xs text-center font-semibold">{error}</p>}
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">New Password</label>
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
              className="w-full bg-[#00d166] text-white hover:bg-emerald-700 transition-colors py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase active:scale-[0.99] mt-2"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      {/* Split Modal Card container */}
      <div 
        className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex animate-slide-up border border-gray-100/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: WhatsRay Orbits & Ambient Glows Visuals (Hidden on small screens) */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-center items-center relative auth-hero auth-login p-8 select-none overflow-hidden h-[610px] border-r border-gray-100/50">
          <div className="auth-hero__ambient auth-hero__ambient--one"></div>
          <div className="auth-hero__ambient auth-hero__ambient--two"></div>
          <div className="auth-hero__grid"></div>

          <div className="auth-login__orbit auth-login__orbit--outer"></div>
          <div className="auth-login__orbit auth-login__orbit--inner"></div>

          <div className="auth-login__art" aria-hidden="true">
            <div className="auth-login__card auth-login__card--top">
              <i className="las la-robot"></i>
              <span>AI Chatbots</span>
            </div>

            <div className="auth-login__stage">
              <div className="auth-login__halo auth-login__halo--one"></div>
              <div className="auth-login__halo auth-login__halo--two"></div>
              <div className="auth-login__halo auth-login__halo--three"></div>
              <div className="auth-login__halo auth-login__halo--four"></div>

              <div className="auth-login__board">
                <div className="auth-login__badge auth-login__badge--inbox">
                  <i className="las la-inbox"></i>
                  <span>Inbox</span>
                </div>
                <div className="auth-login__badge auth-login__badge--contacts">
                  <i className="las la-address-book"></i>
                  <span>Contacts</span>
                </div>
                <div className="auth-login__badge auth-login__badge--campaign">
                  <i className="las la-bullhorn"></i>
                  <span>Campaigns</span>
                </div>
                <div className="auth-login__badge auth-login__badge--automation">
                  <i className="las la-cogs"></i>
                  <span>Automation</span>
                </div>
                <div className="auth-login__badge auth-login__badge--shared">
                  <i className="las la-comments"></i>
                  <span>Shared Inbox</span>
                </div>

                <div className="auth-login__stack auth-login__stack--top">
                  <div className="auth-login__stack-icon"><i className="lab la-whatsapp"></i></div>
                  <div className="auth-login__stack-copy">
                    <strong>AgentBunny</strong>
                    <span>2 synced accounts</span>
                  </div>
                </div>

                <div className="auth-login__stack auth-login__stack--bottom">
                  <div className="auth-login__stack-icon auth-login__stack-icon--green"><i className="las la-paper-plane"></i></div>
                  <div className="auth-login__stack-copy">
                    <strong>Broadcast queued</strong>
                    <span>1,248 recipients</span>
                  </div>
                </div>

                <div className="auth-login__signal auth-login__signal--one">
                  <span className="auth-login__signal-icon"><i className="lab la-whatsapp"></i></span>
                </div>
                <div className="auth-login__signal auth-login__signal--two">
                  <span className="auth-login__signal-icon"><i className="lab la-whatsapp"></i></span>
                </div>
                <div className="auth-login__signal auth-login__signal--three">
                  <span className="auth-login__signal-icon"><i className="lab la-whatsapp"></i></span>
                </div>
                <div className="auth-login__signal auth-login__signal--four">
                  <span className="auth-login__signal-icon"><i className="lab la-whatsapp"></i></span>
                </div>
                <div className="auth-login__dot auth-login__dot--one"></div>
                <div className="auth-login__dot auth-login__dot--two"></div>
                <div className="auth-login__dot auth-login__dot--three"></div>
                <div className="auth-login__orbit auth-login__orbit--mini"></div>
              </div>
            </div>

            <div className="auth-login__card auth-login__card--bottom">
              <i className="las la-users-cog"></i>
              <span>Multiple Agents</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="w-full md:w-1/2 p-6 md:py-6 md:px-10 bg-white flex flex-col justify-center h-[610px] overflow-y-auto">
          {renderForm()}
        </div>
      </div>
    </div>
  );
}

export default Auth;

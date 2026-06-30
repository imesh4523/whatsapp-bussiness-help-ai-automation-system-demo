import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';

const countriesList = [
  { name: 'Sri Lanka', code: '94' },
  { name: 'India', code: '91' },
  { name: 'United States', code: '1' },
  { name: 'United Kingdom', code: '44' },
  { name: 'Australia', code: '61' },
  { name: 'Canada', code: '1' },
  { name: 'Singapore', code: '65' },
  { name: 'New Zealand', code: '64' },
  { name: 'United Arab Emirates', code: '971' }
];

export default function UserProfileSetting({ user, setUser }) {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobile: '',
    dial_code: '94',
    city: '',
    state: '',
    zip: '',
    country: 'Sri Lanka'
  });

  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('https://wpp.raybeamdigital.com/assets/images/avatar.jpg');

  // Load user data on mount
  useEffect(() => {
    if (user) {
      // Split full name if firstname/lastname are not present
      let fname = user.firstname || '';
      let lname = user.lastname || '';
      if (!fname && !lname && user.name) {
        const parts = user.name.trim().split(/\s+/);
        fname = parts[0] || '';
        lname = parts.slice(1).join(' ') || '';
      }

      setFormData({
        firstname: fname,
        lastname: lname,
        email: user.email || '',
        mobile: user.mobile || '',
        dial_code: user.dial_code || '94',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || '',
        country: user.country || 'Sri Lanka'
      });
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-update dial code when country changes
      if (name === 'country') {
        const matched = countriesList.find(c => c.name === value);
        if (matched) {
          updated.dial_code = matched.code;
        }
      }
      return updated;
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        if (window.notify) window.notify('success', 'Profile photo uploaded locally (Demo)!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/profile-setting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update user context state and localStorage
        const updatedUser = {
          ...user,
          ...data.user
        };
        setUser(updatedUser);
        localStorage.setItem('aura_user', JSON.stringify(updatedUser));
        if (window.notify) window.notify('success', 'Profile settings updated successfully!');
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Network error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <form onSubmit={handleSave}>
        {/* Top Header Bar */}
        <div className="container-top flex justify-between items-center flex-wrap gap-4 mb-6">
          <div className="container-top__left">
            <h5 className="container-top__title font-black text-neutral-800 tracking-tight uppercase">Profile Settings</h5>
            <p className="container-top__desc text-xs text-neutral-400 font-bold mt-1">
              Update your account details, mobile number, and regional preferences.
            </p>
          </div>
          <div className="container-top__right">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#00832e] text-white text-xs font-black uppercase tracking-wider hover:bg-[#006e26] transition-all shadow-md border-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="dashboard-container__body bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-8">
          {/* Avatar Upload Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center">
                <img 
                  src={avatarPreview} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <label 
                htmlFor="avatar-input" 
                className="absolute bottom-0 right-0 p-2 bg-[#00832e] hover:bg-[#006e26] text-white rounded-full cursor-pointer shadow-md transition-colors"
              >
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  id="avatar-input" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h6 className="text-xs font-black uppercase tracking-widest text-neutral-500">Avatar Image</h6>
              <p className="text-[11px] text-neutral-400 font-bold">
                Recommended size: 350x300. Supported formats: .jpg, .png, .jpeg
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">First Name *</label>
              <input 
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Last Name *</label>
              <input 
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                placeholder="Enter last name"
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Email Address *</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-neutral-50 text-neutral-400 text-xs font-bold cursor-not-allowed outline-none"
              />
            </div>

            {/* Mobile (Editable dial-code and number) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Mobile *</label>
              <div className="flex gap-2">
                <div className="w-24">
                  <select 
                    name="dial_code"
                    value={formData.dial_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-[#00832e] text-xs font-bold text-neutral-800 focus:outline-none"
                  >
                    {countriesList.map((c) => (
                      <option key={c.name} value={c.code}>
                        +{c.code}
                      </option>
                    ))}
                  </select>
                </div>
                <input 
                  type="number"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                  placeholder="769631098"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">City</label>
              <input 
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                placeholder="Enter city"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">State</label>
              <input 
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                placeholder="Enter state"
              />
            </div>

            {/* Zip */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Zip Code</label>
              <input 
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                placeholder="Enter zip code"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Country</label>
              <select 
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00832e] text-xs font-bold text-neutral-800 focus:outline-none"
              >
                {countriesList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

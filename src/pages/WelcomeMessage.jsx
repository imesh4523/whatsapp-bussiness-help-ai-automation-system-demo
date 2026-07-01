import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('aura_token')}`
});

export default function WelcomeMessage() {
  const [settings, setSettings] = useState({ is_active: false, message: 'Hello! Welcome to our business. How can we help you today?', delay_seconds: 2 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/welcome-message`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSettings(data); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/welcome-message`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        if (window.notify) window.notify('success', 'Welcome message settings saved!');
      } else {
        const d = await res.json();
        if (window.notify) window.notify('error', d.error || 'Failed to save settings');
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="dashboard-container">
      <div className="d-flex align-items-center justify-content-center py-5">
        <span className="loader-static" style={{ width: 40, height: 40, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} />
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Welcome Message</h5>
          <p className="container-top__desc">Automatically greet new contacts when they message you for the first time</p>
        </div>
        <div className="container-top__right">
          <button type="submit" form="welcome-form" className="btn btn--base btn-shadow" disabled={saving}>
            {saved ? <><i className="las la-check me-1" />Saved!</> : <><i className="lab la-telegram me-1" />{saving ? 'Saving...' : 'Save Settings'}</>}
          </button>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
          <form id="welcome-form" onSubmit={handleSave}>
            <div className="information-wrapper p-4 bg-white rounded shadow-sm">
              {/* Toggle */}
              <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                <div>
                  <h6 className="fw-bold mb-1">Enable Welcome Message</h6>
                  <p className="text-muted fs-13 mb-0">Automatically send a greeting when someone messages you for the first time</p>
                </div>
                <div
                  onClick={() => setSettings(p => ({ ...p, is_active: !p.is_active }))}
                  style={{
                    width: 52, height: 28, borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
                    background: settings.is_active ? '#00832e' : '#cbd5e1',
                    position: 'relative', flexShrink: 0
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: settings.is_active ? 26 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="form--label required">Welcome Message Text</label>
                <textarea
                  className="form--control form-two"
                  rows={5}
                  required
                  value={settings.message}
                  onChange={e => setSettings(p => ({ ...p, message: e.target.value }))}
                  placeholder="Hello! Welcome to our business. How can we help you today?"
                  disabled={!settings.is_active}
                  style={{ opacity: settings.is_active ? 1 : 0.5 }}
                />
                <small className="text-muted">You can use {{contactName}} to personalize the message.</small>
              </div>

              {/* Delay */}
              <div>
                <label className="form--label">Send Delay</label>
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="range" min={0} max={30} step={1}
                    value={settings.delay_seconds}
                    onChange={e => setSettings(p => ({ ...p, delay_seconds: parseInt(e.target.value) }))}
                    disabled={!settings.is_active}
                    style={{ flex: 1, accentColor: '#00832e' }}
                  />
                  <span className="badge bg-success fs-13" style={{ minWidth: 60, textAlign: 'center' }}>
                    {settings.delay_seconds}s
                  </span>
                </div>
                <small className="text-muted">How long to wait before sending the welcome message (0 = instant)</small>
              </div>
            </div>
          </form>

          {/* Preview */}
          <div>
            <p className="form--label mb-2">Preview</p>
            <div className="wa-preview-window">
              <div className="wa-preview-header">
                <div className="wa-preview-header__left">
                  <i className="las la-arrow-left" />
                  <div className="wa-preview-header__avatar"><i className="las la-user" /></div>
                  <span className="wa-preview-header__name">New Customer</span>
                </div>
                <div className="wa-preview-header__right">
                  <i className="las la-video" /><i className="las la-phone" /><i className="las la-ellipsis-v" />
                </div>
              </div>
              <div className="wa-preview-body">
                {/* Customer message */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <div style={{ background: '#dcf8c6', borderRadius: '12px 12px 2px 12px', padding: '8px 12px', maxWidth: '75%', fontSize: 13 }}>
                    Hi there! 👋
                    <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 2 }}>12:00 ✓</div>
                  </div>
                </div>
                {/* Welcome reply */}
                {settings.is_active && (
                  <div className="wa-message-bubble">
                    <div className="wa-message-tail" />
                    <div className="wa-message-content">
                      <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {settings.message.replace('{{contactName}}', 'John')}
                      </p>
                      <div className="wa-message-meta">
                        <span className="wa-message-time">12:0{settings.delay_seconds > 0 ? String(settings.delay_seconds).padStart(1,'0') : '0'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {!settings.is_active && (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: 12 }}>
                    <i className="las la-ban" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
                    Welcome message is disabled
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="fw-bold mb-1 fs-13" style={{ color: '#15803d' }}>
                <i className="las la-lightbulb me-1" />How it works
              </p>
              <ul className="mb-0 ps-3" style={{ fontSize: 12, color: '#166534' }}>
                <li>When a new contact messages you for the first time</li>
                <li>System waits <strong>{settings.delay_seconds} second(s)</strong></li>
                <li>Then automatically sends this welcome message</li>
                <li>Works for all connected WhatsApp numbers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

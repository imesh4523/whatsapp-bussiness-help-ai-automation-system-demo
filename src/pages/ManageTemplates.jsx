import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('aura_token')}`
});

const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'si', label: 'Sinhala' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
];

const STATUS_BADGE = { Pending: 'bg-warning', Approved: 'bg-success', Rejected: 'bg-danger' };

// ── Template List Page ──────────────────────────────────────────────────────
function TemplateListPage({ setTab }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp-templates`, { headers: authHeaders() });
      if (res.ok) setTemplates(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await fetch(`${API_BASE_URL}/whatsapp-templates/${id}`, { method: 'DELETE', headers: authHeaders() });
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (window.notify) window.notify('success', 'Template deleted');
  };

  const filtered = templates.filter(t =>
    `${t.name} ${t.body_text} ${t.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">All Templates</h5>
          <p className="container-top__desc">Manage your WhatsApp message templates</p>
        </div>
        <div className="container-top__right">
          <div className="btn--group">
            <button className="btn btn--base btn-shadow" onClick={() => setTab('template_create')}>
              <i className="las la-plus" /> New Template
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div className="body-top">
          <div className="body-top__left">
            <form className="search-form" onSubmit={e => e.preventDefault()}>
              <input type="search" className="form--control" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
              <span className="search-form__icon"><i className="fa-solid fa-magnifying-glass" /></span>
            </form>
          </div>
        </div>

        <div className="dashboard-table">
          <table className="table table--responsive--lg">
            <thead>
              <tr><th>#</th><th>Name</th><th>Category</th><th>Language</th><th>Body Preview</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center py-5">
                  <span className="loader-static" style={{ width: 32, height: 32, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-5">
                  <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" />
                  <span className="d-block mt-2">No templates yet</span>
                  <span className="d-block fs-13 text-muted">Create your first WhatsApp template to get started.</span>
                </td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td><strong>{t.name}</strong></td>
                  <td><span className="badge bg-info text-dark">{t.category}</span></td>
                  <td className="text-muted fs-13">{t.language}</td>
                  <td style={{ maxWidth: 200 }}><span className="text-muted fs-13" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.body_text}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[t.status] || 'bg-secondary'}`}>{t.status}</span></td>
                  <td className="text-muted fs-13">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn--group">
                      <button className="btn btn--sm btn-outline--danger" onClick={() => handleDelete(t.id)} title="Delete"><i className="las la-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Template Create/Edit Page ───────────────────────────────────────────────
function TemplateCreatePage({ setTab, isCarousel = false }) {
  const [form, setForm] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    header_type: 'NONE',
    header_text: '',
    body_text: '',
    footer_text: '',
    buttons: []
  });
  const [saving, setSaving] = useState(false);
  const [newBtn, setNewBtn] = useState({ type: 'QUICK_REPLY', text: '' });

  const updateForm = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addButton = () => {
    if (!newBtn.text.trim()) return;
    setForm(p => ({ ...p, buttons: [...p.buttons, { ...newBtn }] }));
    setNewBtn({ type: 'QUICK_REPLY', text: '' });
  };

  const removeButton = (idx) => setForm(p => ({ ...p, buttons: p.buttons.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp-templates`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      if (res.ok) {
        if (window.notify) window.notify('success', 'Template created successfully!');
        setTab('template_index');
      } else {
        const d = await res.json();
        if (window.notify) window.notify('error', d.error || 'Failed to create template');
      }
    } finally { setSaving(false); }
  };

  const insertVariable = (varText) => {
    updateForm('body_text', (form.body_text || '') + varText);
  };

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">{isCarousel ? 'Carousel Template' : 'New Template'}</h5>
          <p className="container-top__desc">Create a WhatsApp message template</p>
        </div>
        <div className="container-top__right">
          <div className="btn--group">
            <button type="button" className="btn btn--dark" onClick={() => setTab('template_index')}><i className="las la-undo" /> Back</button>
            <button type="submit" form="template-form" className="btn btn--base btn-shadow" disabled={saving}><i className="lab la-telegram" /> {saving ? 'Saving...' : 'Save Template'}</button>
          </div>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div className="information-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
          <form id="template-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form--label required">Template Name</label>
                <input className="form--control form-two" required value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g., order_confirmation, welcome_msg" />
                <small className="text-muted">Use lowercase letters, underscores only. No spaces.</small>
              </div>
              <div className="col-md-6">
                <label className="form--label required">Category</label>
                <select className="form--control form-two" value={form.category} onChange={e => updateForm('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form--label required">Language</label>
                <select className="form--control form-two" value={form.language} onChange={e => updateForm('language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              {/* Header */}
              <div className="col-12">
                <label className="form--label">Header Type</label>
                <select className="form--control form-two" value={form.header_type} onChange={e => updateForm('header_type', e.target.value)}>
                  <option value="NONE">None</option>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>
              </div>
              {form.header_type === 'TEXT' && (
                <div className="col-12">
                  <label className="form--label">Header Text</label>
                  <input className="form--control form-two" value={form.header_text} onChange={e => updateForm('header_text', e.target.value)} placeholder="Header text (max 60 chars)" maxLength={60} />
                </div>
              )}

              {/* Body */}
              <div className="col-12">
                <label className="form--label required">Body Message</label>
                <textarea className="form--control form-two" rows={5} required value={form.body_text} onChange={e => updateForm('body_text', e.target.value)} placeholder="Write your message here. Use {{ 1 }}, {{ 2 }} for dynamic variables." />
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {['{{1}}','{{2}}','{{3}}','{{contactName}}','{{today}}'].map(v => (
                    <button key={v} type="button" className="btn btn--sm btn--dark" onClick={() => insertVariable(v)} style={{ fontSize: 11 }}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="col-12">
                <label className="form--label">Footer Text</label>
                <input className="form--control form-two" value={form.footer_text} onChange={e => updateForm('footer_text', e.target.value)} placeholder="e.g., Reply STOP to unsubscribe" maxLength={60} />
              </div>

              {/* Buttons */}
              <div className="col-12">
                <label className="form--label">Buttons</label>
                {form.buttons.map((btn, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-2 mb-2 p-2 border rounded">
                    <span className="badge bg-secondary">{btn.type}</span>
                    <span className="flex-grow-1">{btn.text}</span>
                    <button type="button" className="btn btn--sm btn-outline--danger" onClick={() => removeButton(idx)}><i className="las la-times" /></button>
                  </div>
                ))}
                {form.buttons.length < 3 && (
                  <div className="d-flex gap-2">
                    <select className="form--control form-two" style={{ maxWidth: 160 }} value={newBtn.type} onChange={e => setNewBtn(p => ({ ...p, type: e.target.value }))}>
                      <option value="QUICK_REPLY">Quick Reply</option>
                      <option value="URL">URL Button</option>
                      <option value="PHONE_NUMBER">Phone Number</option>
                    </select>
                    <input className="form--control form-two flex-grow-1" value={newBtn.text} onChange={e => setNewBtn(p => ({ ...p, text: e.target.value }))} placeholder="Button label" />
                    <button type="button" className="btn btn--base-two" onClick={addButton}><i className="las la-plus" /></button>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Live Preview */}
          <div>
            <p className="form--label mb-2">Live Preview</p>
            <div className="wa-preview-window">
              <div className="wa-preview-header">
                <div className="wa-preview-header__left">
                  <i className="las la-arrow-left" />
                  <div className="wa-preview-header__avatar"><i className="las la-user" /></div>
                  <span className="wa-preview-header__name">Business Account</span>
                </div>
                <div className="wa-preview-header__right">
                  <i className="las la-video" /><i className="las la-phone" /><i className="las la-ellipsis-v" />
                </div>
              </div>
              <div className="wa-preview-body">
                <div className="wa-message-bubble">
                  <div className="wa-message-tail" />
                  <div className="wa-message-content">
                    {form.header_type === 'TEXT' && form.header_text && <h6 style={{ fontWeight: 700, marginBottom: 4 }}>{form.header_text}</h6>}
                    {form.header_type === 'IMAGE' && <div style={{ height: 120, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: '#94a3b8' }}><i className="las la-image" style={{ fontSize: 40 }} /></div>}
                    <p style={{ margin: '0 0 4px 0', whiteSpace: 'pre-wrap', fontSize: 14 }}>{form.body_text || 'Your message body will appear here...'}</p>
                    {form.footer_text && <span style={{ fontSize: 12, color: '#64748b' }}>{form.footer_text}</span>}
                    <div className="wa-message-meta"><span className="wa-message-time">12:00 ✓✓</span></div>
                  </div>
                </div>
                {form.buttons.length > 0 && (
                  <div className="button-preview mt-1 d-flex gap-2 flex-column">
                    {form.buttons.map((btn, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', textAlign: 'center', color: '#0078d7', fontSize: 13, fontWeight: 600 }}>
                        {btn.type === 'URL' ? <i className="las la-external-link-alt me-1" /> : btn.type === 'PHONE_NUMBER' ? <i className="las la-phone me-1" /> : <i className="las la-reply me-1" />}
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
export default function ManageTemplates({ tab, setTab }) {
  if (tab === 'template_create') return <TemplateCreatePage setTab={setTab} />;
  if (tab === 'template_create_carousel') return <TemplateCreatePage setTab={setTab} isCarousel />;
  return <TemplateListPage setTab={setTab} />;
}

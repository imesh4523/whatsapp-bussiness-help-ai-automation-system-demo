import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('aura_token')}`
});

export default function ManageSavedReplies() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', shortcut: '', message: '' });
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/saved-replies`, { headers: authHeaders() });
      if (res.ok) setReplies(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const openAdd = () => { setEditing(null); setForm({ title: '', shortcut: '', message: '' }); setShowModal(true); };
  const openEdit = (r) => { setEditing(r); setForm({ title: r.title, shortcut: r.shortcut, message: r.message }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/saved-replies/${editing.id}` : `${API_BASE_URL}/saved-replies`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        fetch_();
        if (window.notify) window.notify('success', editing ? 'Reply updated!' : 'Reply saved!');
      } else {
        const d = await res.json();
        if (window.notify) window.notify('error', d.error || 'Failed to save reply');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved reply?')) return;
    await fetch(`${API_BASE_URL}/saved-replies/${id}`, { method: 'DELETE', headers: authHeaders() });
    setReplies(prev => prev.filter(r => r.id !== id));
    if (window.notify) window.notify('success', 'Reply deleted');
  };

  const filtered = replies.filter(r =>
    `${r.title} ${r.shortcut} ${r.message}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Saved Replies</h5>
          <p className="container-top__desc">Create quick reply shortcuts to respond faster in your inbox</p>
        </div>
        <div className="container-top__right">
          <button className="btn btn--base btn-shadow" onClick={openAdd}><i className="las la-plus" /> Add Reply</button>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div className="body-top">
          <div className="body-top__left">
            <form className="search-form" onSubmit={e => e.preventDefault()}>
              <input type="search" className="form--control" placeholder="Search replies..." value={search} onChange={e => setSearch(e.target.value)} />
              <span className="search-form__icon"><i className="fa-solid fa-magnifying-glass" /></span>
            </form>
          </div>
        </div>

        <div className="dashboard-table">
          <table className="table table--responsive--lg">
            <thead>
              <tr><th>#</th><th>Title</th><th>Shortcut</th><th>Message Preview</th><th>Created</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-5">
                  <span className="loader-static" style={{ width: 32, height: 32, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5">
                  <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" />
                  <span className="d-block mt-2">No saved replies yet</span>
                  <span className="d-block fs-13 text-muted">Create shortcuts like <strong>/hello</strong> or <strong>/bye</strong> for fast replies.</span>
                </td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><strong>{r.title}</strong></td>
                  <td><span className="badge bg-dark" style={{ fontFamily: 'monospace', fontSize: 12 }}>/{r.shortcut}</span></td>
                  <td style={{ maxWidth: 300 }}>
                    <span className="text-muted fs-13" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.message}
                    </span>
                  </td>
                  <td className="text-muted fs-13">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn--group">
                      <button className="btn btn--sm btn--base-two" onClick={() => openEdit(r)} title="Edit"><i className="las la-pen" /></button>
                      <button className="btn btn--sm btn-outline--danger" onClick={() => handleDelete(r.id)} title="Delete"><i className="las la-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal fade custom--modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Saved Reply' : 'Add Saved Reply'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form--label required">Title</label>
                      <input className="form--control form-two" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Greeting Message" />
                    </div>
                    <div className="col-md-6">
                      <label className="form--label required">Shortcut</label>
                      <div className="input-group">
                        <span className="input-group-text">/</span>
                        <input className="form--control form-two" required value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value.replace(/^\//, '').replace(/\s/g, '') }))} placeholder="hello" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} />
                      </div>
                      <small className="text-muted">Type /shortcut in inbox to use this reply</small>
                    </div>
                    <div className="col-12">
                      <label className="form--label required">Message</label>
                      <textarea className="form--control form-two" rows={5} required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write the full reply message here..." />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn--dark" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--base" disabled={saving}>
                    <i className="lab la-telegram me-1" />{saving ? 'Saving...' : editing ? 'Update Reply' : 'Save Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// ── Shared helpers ──────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('aura_token')}`
});

const TAG_COLORS = [
  '#00832e','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'
];

// ── Sub-page: Manage Contacts ───────────────────────────────────────────────
function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', mobile_code: '+94', mobile: '', email: '', company: '' });
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/contacts`, { headers: authHeaders() });
      if (res.ok) setContacts(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const openAdd = () => { setEditing(null); setForm({ first_name: '', last_name: '', mobile_code: '+94', mobile: '', email: '', company: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ first_name: c.first_name, last_name: c.last_name, mobile_code: c.mobile_code, mobile: c.mobile, email: c.email, company: c.company }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/contacts/${editing.id}` : `${API_BASE_URL}/contacts`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); fetch_(); if (window.notify) window.notify('success', editing ? 'Contact updated!' : 'Contact added!'); }
      else { const d = await res.json(); if (window.notify) window.notify('error', d.error); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await fetch(`${API_BASE_URL}/contacts/${id}`, { method: 'DELETE', headers: authHeaders() });
    setContacts(prev => prev.filter(c => c.id !== id));
    if (window.notify) window.notify('success', 'Contact deleted');
  };

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.mobile} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Manage Contacts</h5>
          <p className="container-top__desc">Store and manage your WhatsApp contacts</p>
        </div>
        <div className="container-top__right">
          <button className="btn btn--base btn-shadow" onClick={openAdd}>
            <i className="las la-plus" /> Add New
          </button>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div className="body-top">
          <div className="body-top__left">
            <form className="search-form" onSubmit={e => e.preventDefault()}>
              <input type="search" className="form--control" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
              <span className="search-form__icon"><i className="fa-solid fa-magnifying-glass" /></span>
            </form>
          </div>
        </div>

        <div className="dashboard-table">
          <table className="table table--responsive--lg">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Company</th>
                <th>Tags</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-5"><span className="loader-static" style={{ width: 32, height: 32, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr className="text-center empty-message-row">
                  <td colSpan="7" className="text-center">
                    <div className="py-5">
                      <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" />
                      <span className="d-block mt-2">No contacts found</span>
                      <span className="d-block fs-13 text-muted">Add your first contact to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td><strong>{c.first_name} {c.last_name}</strong></td>
                  <td><span className="badge bg-light text-dark">{c.mobile_code} {c.mobile}</span></td>
                  <td>{c.email || <span className="text-muted">—</span>}</td>
                  <td>{c.company || <span className="text-muted">—</span>}</td>
                  <td>
                    {(c.tags || []).map(t => (
                      <span key={t.id} className="badge me-1" style={{ backgroundColor: t.color, color: '#fff', fontSize: 11 }}>{t.name}</span>
                    ))}
                  </td>
                  <td>
                    <div className="btn--group">
                      <button className="btn btn--sm btn--base-two" onClick={() => openEdit(c)} title="Edit"><i className="las la-pen" /></button>
                      <button className="btn btn--sm btn-outline--danger" onClick={() => handleDelete(c.id)} title="Delete"><i className="las la-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal fade custom--modal show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Contact' : 'Add New Contact'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form--label required">First Name</label>
                      <input className="form--control form-two" required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form--label">Last Name</label>
                      <input className="form--control form-two" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                    </div>
                    <div className="col-md-3">
                      <label className="form--label required">Dial Code</label>
                      <input className="form--control form-two" required value={form.mobile_code} onChange={e => setForm(p => ({ ...p, mobile_code: e.target.value }))} placeholder="+94" />
                    </div>
                    <div className="col-md-9">
                      <label className="form--label required">Mobile Number</label>
                      <input className="form--control form-two" required value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="771234567" />
                    </div>
                    <div className="col-md-6">
                      <label className="form--label">Email</label>
                      <input type="email" className="form--control form-two" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                    </div>
                    <div className="col-md-6">
                      <label className="form--label">Company</label>
                      <input className="form--control form-two" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn--dark" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--base" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Contact' : 'Add Contact'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-page: Contact Tags ──────────────────────────────────────────────────
function ContactTagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#00832e' });
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/contact-tags`, { headers: authHeaders() });
      if (res.ok) setTags(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', color: '#00832e' }); setShowModal(true); };
  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, color: t.color }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/contact-tags/${editing.id}` : `${API_BASE_URL}/contact-tags`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); fetch_(); if (window.notify) window.notify('success', editing ? 'Tag updated!' : 'Tag created!'); }
      else { const d = await res.json(); if (window.notify) window.notify('error', d.error); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tag?')) return;
    await fetch(`${API_BASE_URL}/contact-tags/${id}`, { method: 'DELETE', headers: authHeaders() });
    setTags(prev => prev.filter(t => t.id !== id));
    if (window.notify) window.notify('success', 'Tag deleted');
  };

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Manage Contact Tags</h5>
          <p className="container-top__desc">Create and manage labels to organize your contacts</p>
        </div>
        <div className="container-top__right">
          <button className="btn btn--base btn-shadow" onClick={openAdd}><i className="las la-plus" /> Add Tag</button>
        </div>
      </div>
      <div className="dashboard-container__body">
        <div className="dashboard-table">
          <table className="table table--responsive--md">
            <thead>
              <tr><th>#</th><th>Tag Name</th><th>Color</th><th>Contacts</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-5"><span className="loader-static" style={{ width: 32, height: 32, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} /></td></tr>
              ) : tags.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5">
                  <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" />
                  <span className="d-block mt-2">No tags yet. Create your first tag!</span>
                </td></tr>
              ) : tags.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td><span className="badge" style={{ backgroundColor: t.color, color: '#fff', fontSize: 13, padding: '5px 12px' }}>{t.name}</span></td>
                  <td><div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: t.color, border: '2px solid #e2e8f0' }} /></td>
                  <td><span className="badge bg-secondary">{t.contact_count || 0}</span></td>
                  <td>
                    <div className="btn--group">
                      <button className="btn btn--sm btn--base-two" onClick={() => openEdit(t)}><i className="las la-pen" /></button>
                      <button className="btn btn--sm btn-outline--danger" onClick={() => handleDelete(t.id)}><i className="las la-trash" /></button>
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Tag' : 'Create Tag'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form--label required">Tag Name</label>
                    <input className="form--control form-two" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., VIP, Hot Lead, Follow Up" />
                  </div>
                  <div>
                    <label className="form--label">Tag Color</label>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {TAG_COLORS.map(c => (
                        <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: form.color === c ? '3px solid #1e293b' : '2px solid #e2e8f0', transition: 'all 0.15s' }} />
                      ))}
                    </div>
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <label className="form--label mb-0">Custom:</label>
                      <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                      <span style={{ color: form.color, fontFamily: 'monospace' }}>{form.color}</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn--dark" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--base" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Tag' : 'Create Tag'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-page: Contact Lists ─────────────────────────────────────────────────
function ContactListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/contact-lists`, { headers: authHeaders() });
      if (res.ok) setLists(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (l) => { setEditing(l); setForm({ name: l.name, description: l.description }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/contact-lists/${editing.id}` : `${API_BASE_URL}/contact-lists`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); fetch_(); if (window.notify) window.notify('success', editing ? 'List updated!' : 'List created!'); }
      else { const d = await res.json(); if (window.notify) window.notify('error', d.error); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this list?')) return;
    await fetch(`${API_BASE_URL}/contact-lists/${id}`, { method: 'DELETE', headers: authHeaders() });
    setLists(prev => prev.filter(l => l.id !== id));
    if (window.notify) window.notify('success', 'List deleted');
  };

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Manage Contact Lists</h5>
          <p className="container-top__desc">Group your contacts into lists for bulk campaigns</p>
        </div>
        <div className="container-top__right">
          <button className="btn btn--base btn-shadow" onClick={openAdd}><i className="las la-plus" /> Create List</button>
        </div>
      </div>
      <div className="dashboard-container__body">
        <div className="dashboard-table">
          <table className="table table--responsive--md">
            <thead>
              <tr><th>#</th><th>List Name</th><th>Description</th><th>Contacts</th><th>Created</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-5"><span className="loader-static" style={{ width: 32, height: 32, border: '3px solid #00832e', borderStyle: 'solid solid dotted dotted', borderRadius: '50%', display: 'inline-block', animation: 'rotation-static 1s linear infinite' }} /></td></tr>
              ) : lists.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5">
                  <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" />
                  <span className="d-block mt-2">No lists yet. Create your first contact list!</span>
                </td></tr>
              ) : lists.map((l, i) => (
                <tr key={l.id}>
                  <td>{i + 1}</td>
                  <td><strong>{l.name}</strong></td>
                  <td className="text-muted">{l.description || '—'}</td>
                  <td><span className="badge bg-success">{l.contact_count || 0} contacts</span></td>
                  <td className="text-muted fs-13">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn--group">
                      <button className="btn btn--sm btn--base-two" onClick={() => openEdit(l)}><i className="las la-pen" /></button>
                      <button className="btn btn--sm btn-outline--danger" onClick={() => handleDelete(l.id)}><i className="las la-trash" /></button>
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit List' : 'Create Contact List'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form--label required">List Name</label>
                    <input className="form--control form-two" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Monthly Newsletter, Premium Customers" />
                  </div>
                  <div>
                    <label className="form--label">Description</label>
                    <textarea className="form--control form-two" rows="3" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this list..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn--dark" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--base" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update List' : 'Create List'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export: routes to sub-page based on `tab` prop ─────────────────────
export default function ManageContacts({ tab }) {
  if (tab === 'contact_tag_list') return <ContactTagsPage />;
  if (tab === 'contactlist_list') return <ContactListsPage />;
  return <ContactsPage />;
}

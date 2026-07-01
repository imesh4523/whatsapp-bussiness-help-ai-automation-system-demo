import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function WhatsAppBulkCampaign({ tab, setTab }) {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [polling, setPolling] = useState(false);

  // New Campaign Form State
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [rawNumbers, setRawNumbers] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [delayMin, setDelayMin] = useState(5);
  const [delayMax, setDelayMax] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [uniqueCount, setUniqueCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // AI Assistant States
  const [aiInstructions, setAiInstructions] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGeneratedText, setAiGeneratedText] = useState('');

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'success', 'failed', 'pending'

  // Fetch campaigns history
  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active WhatsApp sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        const connected = data.find(s => s.status === 'Connected');
        if (connected) {
          setSelectedSessionId(connected.id);
        } else if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Fetch single campaign details and logs
  const fetchCampaignDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaignDetails(data.campaign);
        setLogs(data.logs);
        
        // Auto stop polling if campaign is completed or cancelled
        if (data.campaign.status !== 'Running') {
          setPolling(false);
        }
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err);
    }
  };

  // Poll campaign details if it is running
  useEffect(() => {
    let interval;
    if (polling && selectedCampaignId) {
      interval = setInterval(() => {
        fetchCampaignDetails(selectedCampaignId);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [polling, selectedCampaignId]);

  useEffect(() => {
    fetchCampaigns();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (tab === 'campaign_index') {
      fetchCampaigns();
      setSelectedCampaignId(null);
      setCampaignDetails(null);
      setPolling(false);
    }
  }, [tab]);

  // Handle parse/format duplicate detection in textarea
  useEffect(() => {
    if (!rawNumbers.trim()) {
      setUniqueCount(0);
      setDuplicateCount(0);
      return;
    }

    const lines = rawNumbers.split(/[\n,;]+/).map(n => n.trim().replace(/\D/g, '')).filter(Boolean);
    const unique = [...new Set(lines)];
    setUniqueCount(unique.length);
    setDuplicateCount(lines.length - unique.length);
  }, [rawNumbers]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!title.trim() || !messageText.trim() || !rawNumbers.trim()) {
      if (window.notify) window.notify('error', 'All fields are required.');
      return;
    }

    const numbersList = rawNumbers.split(/[\n,;]+/).map(n => n.trim().replace(/\D/g, '')).filter(Boolean);
    if (numbersList.length === 0) {
      if (window.notify) window.notify('error', 'No valid numbers found.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          title,
          messageText,
          numbers: numbersList,
          delayMin,
          delayMax,
          sessionId: selectedSessionId
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (window.notify) window.notify('success', 'Campaign started successfully!');
        setTitle('');
        setMessageText('');
        setRawNumbers('');
        setTab('campaign_index');
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to create campaign.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Network error starting campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns/${id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        if (window.notify) window.notify('success', 'Campaign paused.');
        fetchCampaigns();
        if (selectedCampaignId === id) {
          fetchCampaignDetails(id);
          setPolling(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns/${id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        if (window.notify) window.notify('success', 'Campaign resumed.');
        fetchCampaigns();
        if (selectedCampaignId === id) {
          fetchCampaignDetails(id);
          setPolling(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this campaign? Pending messages will not be sent.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/campaigns/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        if (window.notify) window.notify('success', 'Campaign cancelled.');
        fetchCampaigns();
        if (selectedCampaignId === id) {
          fetchCampaignDetails(id);
          setPolling(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAiMessage = async () => {
    if (!aiInstructions.trim()) {
      if (window.notify) window.notify('error', 'Please provide instructions for the AI.');
      return;
    }

    setGeneratingAi(true);
    setAiGeneratedText('');
    try {
      const res = await fetch(`${API_BASE_URL}/marketing/generate-ai-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ instructions: aiInstructions })
      });
      const data = await res.json();
      if (res.ok) {
        setAiGeneratedText(data.text);
        if (window.notify) window.notify('success', 'Message generated!');
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to generate message.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Failed to reach AI generator.');
    } finally {
      setGeneratingAi(false);
    }
  };

  // View Details helper
  const handleViewDetails = (id) => {
    setSelectedCampaignId(id);
    fetchCampaignDetails(id);
    setPolling(true);
  };

  // Filter logs list
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.phone_number.includes(searchTerm);
    if (!matchesSearch) return false;
    if (logFilter === 'all') return true;
    return l.status.toLowerCase() === logFilter;
  });

  const getStatusBadge = (status) => {
    const mapping = {
      Running: 'badge bg-animated-green text-white',
      Paused: 'badge bg-warning text-dark',
      Completed: 'badge bg-success text-white',
      Cancelled: 'badge bg-secondary text-white'
    };
    return mapping[status] || 'badge bg-light text-dark';
  };

  return (
    <div className="dashboard-container" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ── 1. MAIN CAMPAIGN LIST VIEW ── */}
      {tab === 'campaign_index' && !selectedCampaignId && (
        <>
          <div className="container-top">
            <div className="container-top__left">
              <h5 className="container-top__title">WhatsApp Bulk Campaigns</h5>
              <p className="container-top__desc">Deduplicate numbers, apply randomized intervals, and send custom AI messages.</p>
            </div>
            <div className="container-top__right">
              <button onClick={() => setTab('campaign_create')} className="btn btn--base btn-shadow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                <i className="las la-plus-circle" style={{ fontSize: '18px' }}></i> Create Campaign
              </button>
            </div>
          </div>

          <div className="dashboard-container__body mt-4">
            {/* Stats Dashboard Grid */}
            <div className="row g-4 mb-4">
              <div className="col-md-3">
                <div className="dash-v2-card shadow-sm p-4 d-flex align-items-center" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f1f5f9' }}>
                  <div className="dash-v2-icon-vibrant bg-emerald-100 text-emerald-600 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', borderRadius: '12px', fontSize: '20px' }}>
                    <i className="las la-bullhorn"></i>
                  </div>
                  <div>
                    <span className="text-muted fs-12 d-block">Total Campaigns</span>
                    <h4 className="fw-bold mb-0">{campaigns.length}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="dash-v2-card shadow-sm p-4 d-flex align-items-center" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f1f5f9' }}>
                  <div className="dash-v2-icon-vibrant bg-blue-100 text-blue-600 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', borderRadius: '12px', fontSize: '20px' }}>
                    <i className="las la-check-double"></i>
                  </div>
                  <div>
                    <span className="text-muted fs-12 d-block">Delivered</span>
                    <h4 className="fw-bold mb-0">{campaigns.reduce((acc, c) => acc + (c.success_count || 0), 0)}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="dash-v2-card shadow-sm p-4 d-flex align-items-center" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f1f5f9' }}>
                  <div className="dash-v2-icon-vibrant bg-red-100 text-red-600 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', borderRadius: '12px', fontSize: '20px' }}>
                    <i className="las la-exclamation-circle"></i>
                  </div>
                  <div>
                    <span className="text-muted fs-12 d-block">Failed sends</span>
                    <h4 className="fw-bold mb-0">{campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0)}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="dash-v2-card shadow-sm p-4 d-flex align-items-center" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f1f5f9' }}>
                  <div className="dash-v2-icon-vibrant bg-orange-100 text-orange-600 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', borderRadius: '12px', fontSize: '20px' }}>
                    <i className="las la-clock"></i>
                  </div>
                  <div>
                    <span className="text-muted fs-12 d-block">Active Worker</span>
                    <h4 className="fw-bold mb-0">{campaigns.filter(c => c.status === 'Running').length > 0 ? 'RUNNING' : 'IDLE'}</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="dash-v2-card shadow-sm p-4 bg-white" style={{ borderRadius: '20px', border: '1px solid #f1f5f9' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Campaign Execution Logs</h6>
              </div>
              {loading ? (
                <div className="py-5 text-center">
                  <div className="spinner-border text-success" role="status"></div>
                  <span className="d-block mt-2 text-muted">Loading campaigns...</span>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-5 text-center">
                  <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" style={{ width: '120px', opacity: 0.6 }} alt="No campaigns" />
                  <span className="d-block text-muted fw-semibold mt-3">No campaigns created yet</span>
                  <span className="d-block text-muted small">Click "Create Campaign" at the top to start bulk sending.</span>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                    <thead>
                      <tr className="text-muted small uppercase" style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ padding: '12px 16px' }}>Campaign</th>
                        <th>Progress</th>
                        <th>Stats</th>
                        <th>Delays</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => {
                        const pct = c.total_numbers > 0 ? Math.round((c.sent_count / c.total_numbers) * 100) : 0;
                        return (
                          <tr key={c.id} style={{ background: '#f8fafc', transition: 'all 0.2s' }} className="hover-slate">
                            <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontWeight: '600', color: '#1e293b' }}>
                              <div>{c.title}</div>
                              <span className="text-muted small font-normal d-block text-truncate" style={{ maxWidth: '200px' }}>{c.message_text}</span>
                            </td>
                            <td style={{ width: '160px' }}>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress w-100" style={{ height: '6px', borderRadius: '50px' }}>
                                  <div className="progress-bar bg-success" style={{ width: `${pct}%`, borderRadius: '50px' }}></div>
                                </div>
                                <span className="small fw-bold">{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span className="small text-muted">Sent: </span>
                              <span className="fw-semibold text-slate-800">{c.sent_count}/{c.total_numbers}</span>
                              <div className="small font-light text-muted">
                                Success: <span className="text-success fw-bold">{c.success_count}</span> | Failed: <span className="text-danger">{c.failed_count}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark small" style={{ fontSize: '11px' }}>{c.delay_min} - {c.delay_max}s</span>
                            </td>
                            <td>
                              <span className={getStatusBadge(c.status)} style={{ padding: '6px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>
                                {c.status}
                              </span>
                            </td>
                            <td className="small text-muted">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                            <td className="text-end" style={{ borderRadius: '0 12px 12px 0', paddingRight: '16px' }}>
                              <div className="d-flex justify-content-end gap-1.5">
                                <button onClick={() => handleViewDetails(c.id)} className="btn btn-outline--base btn-sm py-1 px-2.5" title="View Logs" style={{ fontSize: '12px', borderRadius: '8px' }}>
                                  <i className="las la-eye"></i> View
                                </button>
                                {c.status === 'Running' && (
                                  <button onClick={() => handlePause(c.id)} className="btn btn-outline-warning btn-sm py-1 px-2" title="Pause" style={{ fontSize: '12px', borderRadius: '8px' }}>
                                    <i className="las la-pause"></i>
                                  </button>
                                )}
                                {c.status === 'Paused' && (
                                  <button onClick={() => handleResume(c.id)} className="btn btn-outline-success btn-sm py-1 px-2" title="Resume" style={{ fontSize: '12px', borderRadius: '8px' }}>
                                    <i className="las la-play"></i>
                                  </button>
                                )}
                                {(c.status === 'Running' || c.status === 'Paused') && (
                                  <button onClick={() => handleCancel(c.id)} className="btn btn-outline-danger btn-sm py-1 px-2" title="Cancel" style={{ fontSize: '12px', borderRadius: '8px' }}>
                                    <i className="las la-times-circle"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 2. NEW CAMPAIGN CREATION FORM VIEW ── */}
      {tab === 'campaign_create' && (
        <>
          <div className="container-top">
            <div className="container-top__left">
              <h5 className="container-top__title">New Bulk Campaign</h5>
              <p className="container-top__desc">Configure anti-ban timing and launch bulk WhatsApp messages.</p>
            </div>
            <div className="container-top__right">
              <button onClick={() => setTab('campaign_index')} className="btn btn--dark" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '10px 20px' }}>
                <i className="las la-undo-alt"></i> Back to Campaigns
              </button>
            </div>
          </div>

          <div className="dashboard-container__body mt-4">
            <form onSubmit={handleCreateCampaign}>
              <div className="row g-4">
                <div className="col-lg-7">
                  <div className="dash-v2-card shadow-sm p-4 bg-white h-100" style={{ borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <h6 className="fw-bold mb-4" style={{ color: '#1e293b' }}><i className="las la-cog text-success me-2"></i>Campaign Settings</h6>
                    
                    <div className="form-group mb-3">
                      <label className="label-two required form--label font-semibold mb-1" htmlFor="title">Campaign Title</label>
                      <input type="text" className="form--control" placeholder="Enter campaign name/reference..." required value={title} onChange={(e) => setTitle(e.target.value)} id="title" style={{ borderRadius: '10px' }} />
                    </div>

                    <div className="form-group mb-3">
                      <label className="label-two required form--label font-semibold mb-1" htmlFor="session_select">WhatsApp Session</label>
                      <select className="form-select form--control" id="session_select" value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)} style={{ borderRadius: '10px' }}>
                        {sessions.length === 0 && <option value="">No sessions configured</option>}
                        {sessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.phone ? `+${s.phone}` : s.id} ({s.status})
                          </option>
                        ))}
                      </select>
                      <small className="text-muted fs-11 mt-1 d-block">Sends using this selected connected WhatsApp session.</small>
                    </div>

                    <div className="form-group mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="label-two required form--label font-semibold mb-0" htmlFor="numbers">Recipient Numbers</label>
                        <span className="small text-muted font-light">
                          Unique: <b className="text-success">{uniqueCount}</b>
                          {duplicateCount > 0 && <span className="text-warning ms-1">({duplicateCount} duplicates filtered)</span>}
                        </span>
                      </div>
                      <textarea className="form--control font-monospace" placeholder="Paste numbers separated by newlines, commas, or semicolons...&#10;e.g.&#10;94771234567&#10;94772345678" required value={rawNumbers} onChange={(e) => setRawNumbers(e.target.value)} id="numbers" rows={6} style={{ borderRadius: '10px', fontSize: '13px' }}></textarea>
                      <small className="text-muted fs-11 mt-1.5 d-block">
                        Duplicates will be stripped automatically. Make sure numbers have international codes prefix (e.g. 947XXXXXXXX).
                      </small>
                    </div>

                    {/* Randomized Delay Timing Config */}
                    <div className="border-top pt-3 mt-4">
                      <div className="d-flex align-items-center mb-2">
                        <h6 className="fw-bold mb-0 text-slate-800 me-2" style={{ fontSize: '13px' }}><i className="las la-clock text-slate-600"></i> Anti-Ban Delivery Intervals</h6>
                        <span className="badge bg-success-light text-success font-semibold px-2 py-0.5" style={{ fontSize: '10px', borderRadius: '30px' }}>RECOMMENDED</span>
                      </div>
                      <p className="text-muted fs-11 mb-3">
                        The worker simulation uses a random delay between the min and max values between each consecutive send. This prevents WhatsApp spam detection systems from blocking your session.
                      </p>
                      <div className="row g-3">
                        <div className="col-6">
                          <label className="small text-slate-600 mb-1" htmlFor="delay_min">Min Delay (seconds)</label>
                          <input type="number" className="form--control" id="delay_min" min="1" max="120" value={delayMin} onChange={(e) => setDelayMin(parseInt(e.target.value) || 1)} style={{ borderRadius: '8px' }} />
                        </div>
                        <div className="col-6">
                          <label className="small text-slate-600 mb-1" htmlFor="delay_max">Max Delay (seconds)</label>
                          <input type="number" className="form--control" id="delay_max" min="2" max="300" value={delayMax} onChange={(e) => setDelayMax(parseInt(e.target.value) || 2)} style={{ borderRadius: '8px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-5">
                  <div className="vstack gap-4 h-100">
                    {/* Message Composer & AI Assistant */}
                    <div className="dash-v2-card shadow-sm p-4 bg-white" style={{ borderRadius: '20px', border: '1px solid #f1f5f9', flex: 1 }}>
                      <h6 className="fw-bold mb-3" style={{ color: '#1e293b' }}><i className="las la-pen text-success me-2"></i>Compose Message</h6>
                      
                      <div className="form-group mb-4">
                        <textarea className="form--control" placeholder="Type your campaign message here..." required value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={7} style={{ borderRadius: '10px', fontSize: '14px', lineHeight: '1.5' }}></textarea>
                        <small className="text-muted fs-11 mt-1.5 d-block">
                          Formatting tips: use *text* for <b>bold</b>, _text_ for <i>italics</i>, ~text~ for <del>strikethrough</del>.
                        </small>
                      </div>

                      {/* AI Generator Panel */}
                      <div className="p-3 border rounded-3 bg-light" style={{ borderColor: '#e2e8f0' }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="las la-robot text-success fs-5 me-1.5"></i>
                          <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '13px' }}>AI Copywriter Helper</h6>
                        </div>
                        <p className="text-muted fs-11 mb-2">
                          Need copy ideas? Write instructions below and our AI will draft a high-quality WhatsApp campaign message.
                        </p>
                        <textarea className="form--control bg-white mb-2" placeholder="e.g. Write a friendly promo message offering 15% off shoes with code SHOE15..." value={aiInstructions} onChange={(e) => setAiInstructions(e.target.value)} rows={3} style={{ borderRadius: '8px', fontSize: '12px' }}></textarea>
                        <button type="button" onClick={handleGenerateAiMessage} disabled={generatingAi} className="btn btn--base btn-sm py-1.5 px-3 w-100 d-flex align-items-center justify-content-center gap-1.5" style={{ borderRadius: '8px', fontSize: '12px' }}>
                          {generatingAi ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status"></span> Generating...
                            </>
                          ) : (
                            <>
                              <i className="las la-magic"></i> Generate Copy
                            </>
                          )}
                        </button>

                        {aiGeneratedText && (
                          <div className="mt-3 p-2 bg-emerald-50 rounded border border-emerald-100">
                            <span className="small fw-semibold text-emerald-800 d-block mb-1">Generated Output:</span>
                            <div className="text-slate-700 small font-monospace whitespace-pre-wrap p-2 bg-white rounded border" style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '11px', lineHeight: '1.4' }}>
                              {aiGeneratedText}
                            </div>
                            <button type="button" onClick={() => { setMessageText(aiGeneratedText); if (window.notify) window.notify('success', 'Copied to editor!'); }} className="btn btn-outline-success btn-sm w-100 py-1.5 mt-2 d-flex align-items-center justify-content-center gap-1.5" style={{ borderRadius: '8px', fontSize: '11px' }}>
                              <i className="las la-copy"></i> Use this message
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className="btn btn--base btn-shadow py-3 font-semibold w-100 d-flex align-items-center justify-content-center gap-2" style={{ borderRadius: '16px', fontSize: '15px' }}>
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span> Starting Campaign...
                        </>
                      ) : (
                        <>
                          <i className="lab la-telegram-plane"></i> Launch Campaign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── 3. CAMPAIGN DETAILS & LOGS VIEW ── */}
      {selectedCampaignId && campaignDetails && (
        <>
          <div className="container-top">
            <div className="container-top__left">
              <h5 className="container-top__title">Campaign: {campaignDetails.title}</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={getStatusBadge(campaignDetails.status)} style={{ padding: '4px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>
                  {campaignDetails.status}
                </span>
                <span className="text-muted small">ID: #{campaignDetails.id}</span>
              </div>
            </div>
            <div className="container-top__right">
              <div className="btn--group">
                <button onClick={() => { setSelectedCampaignId(null); setCampaignDetails(null); setPolling(false); }} className="btn btn--dark" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '10px 20px' }}>
                  <i className="las la-undo-alt"></i> Back to List
                </button>
                {campaignDetails.status === 'Running' && (
                  <button onClick={() => handlePause(campaignDetails.id)} className="btn btn-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '10px 20px' }}>
                    <i className="las la-pause"></i> Pause
                  </button>
                )}
                {campaignDetails.status === 'Paused' && (
                  <button onClick={() => handleResume(campaignDetails.id)} className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '10px 20px' }}>
                    <i className="las la-play"></i> Resume
                  </button>
                )}
                {(campaignDetails.status === 'Running' || campaignDetails.status === 'Paused') && (
                  <button onClick={() => handleCancel(campaignDetails.id)} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '12px', padding: '10px 20px' }}>
                    <i className="las la-times-circle"></i> Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-container__body mt-4">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="vstack gap-4">
                  {/* Campaign Info Card */}
                  <div className="dash-v2-card shadow-sm p-4 bg-white" style={{ borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <h6 className="fw-bold mb-3" style={{ color: '#1e293b' }}>Details</h6>
                    
                    <div className="mb-3">
                      <span className="small text-muted d-block">Message Content:</span>
                      <div className="p-3 bg-light rounded text-slate-700 font-monospace whitespace-pre-wrap small border mt-1" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {campaignDetails.message_text}
                      </div>
                    </div>

                    <hr className="my-3" />

                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-muted">Delay Config:</span>
                      <span className="small fw-semibold">{campaignDetails.delay_min} - {campaignDetails.delay_max} seconds</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-muted">Created:</span>
                      <span className="small text-slate-700">{new Date(campaignDetails.created_at).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="small text-muted">Last Updated:</span>
                      <span className="small text-slate-700">{new Date(campaignDetails.updated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress & Delivery Stats Card */}
                  <div className="dash-v2-card shadow-sm p-4 bg-white" style={{ borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <h6 className="fw-bold mb-4" style={{ color: '#1e293b' }}>Sending Progress</h6>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <span className="small fw-bold text-slate-800">Completion</span>
                        <span className="small fw-bold text-success">
                          {campaignDetails.total_numbers > 0 ? Math.round((campaignDetails.sent_count / campaignDetails.total_numbers) * 100) : 0}%
                        </span>
                      </div>
                      <div className="progress" style={{ height: '10px', borderRadius: '50px' }}>
                        <div className="progress-bar bg-success" style={{ width: `${campaignDetails.total_numbers > 0 ? (campaignDetails.sent_count / campaignDetails.total_numbers) * 100 : 0}%`, borderRadius: '50px' }}></div>
                      </div>
                    </div>

                    {/* Stats List */}
                    <div className="vstack gap-2">
                      <div className="d-flex justify-content-between align-items-center p-2 rounded hover-slate" style={{ background: '#f8fafc' }}>
                        <span className="small text-muted"><i className="las la-phone me-1.5"></i>Total Recipients</span>
                        <span className="fw-bold text-slate-800">{campaignDetails.total_numbers}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded hover-slate" style={{ background: '#f8fafc' }}>
                        <span className="small text-success"><i className="las la-check-circle me-1.5"></i>Delivered</span>
                        <span className="fw-bold text-success">{campaignDetails.success_count}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded hover-slate" style={{ background: '#f8fafc' }}>
                        <span className="small text-danger"><i className="las la-exclamation-triangle me-1.5"></i>Failed</span>
                        <span className="fw-bold text-danger">{campaignDetails.failed_count}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded hover-slate" style={{ background: '#f8fafc' }}>
                        <span className="small text-warning"><i className="las la-clock me-1.5"></i>Pending Queue</span>
                        <span className="fw-bold text-warning">
                          {campaignDetails.total_numbers - campaignDetails.sent_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs Table */}
              <div className="col-lg-8">
                <div className="dash-v2-card shadow-sm p-4 bg-white h-100" style={{ borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Recipient Delivery Logs</h6>
                    
                    {/* Log Filter Buttons */}
                    <div className="d-flex gap-1.5 bg-light p-1 rounded" style={{ borderRadius: '10px' }}>
                      {['all', 'success', 'failed', 'pending'].map(f => (
                        <button key={f} onClick={() => setLogFilter(f)} className={`btn btn-sm px-3 py-1 font-semibold uppercase ${logFilter === f ? 'btn--base text-white shadow-sm' : 'bg-transparent text-slate-500'}`} style={{ fontSize: '10px', border: 'none', borderRadius: '8px' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search filter logs */}
                  <div className="mb-3">
                    <div className="position-relative search-form w-100">
                      <input type="search" className="form--control" placeholder="Search recipient phone number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ borderRadius: '10px', paddingLeft: '38px' }} />
                      <span className="search-form__icon" style={{ left: '15px' }}><i className="fa-solid fa-magnifying-glass"></i></span>
                    </div>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <div className="py-5 text-center">
                      <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" style={{ width: '80px', opacity: 0.5 }} alt="No logs" />
                      <span className="d-block text-muted small mt-2">No matching logs found</span>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                      <table className="table align-middle">
                        <thead>
                          <tr className="text-muted small uppercase" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '10px' }}>Recipient Number</th>
                            <th>Status</th>
                            <th>Details / Failure Reason</th>
                            <th className="text-end">Sent Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map(l => (
                            <tr key={l.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td className="fw-semibold text-slate-800" style={{ padding: '12px 10px' }}>
                                +{l.phone_number}
                              </td>
                              <td>
                                <span className={`badge ${
                                  l.status === 'Success' ? 'bg-success-light text-success' :
                                  l.status === 'Failed' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                                }`} style={{ fontSize: '10px', borderRadius: '4px', padding: '4px 8px' }}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="small text-muted font-normal">
                                {l.status === 'Failed' ? (
                                  <span className="text-danger"><i className="las la-exclamation-triangle me-1"></i>{l.error_message || 'Unknown failure'}</span>
                                ) : l.status === 'Success' ? (
                                  <span className="text-success"><i className="las la-check-circle me-1"></i>Delivered successfully</span>
                                ) : (
                                  <span>In pending delivery queue</span>
                                )}
                              </td>
                              <td className="small text-muted text-end">
                                {l.sent_at ? new Date(l.sent_at).toLocaleTimeString() : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

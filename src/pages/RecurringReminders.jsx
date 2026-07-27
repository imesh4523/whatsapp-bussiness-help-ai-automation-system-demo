import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function RecurringReminders({ user }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending'); // 'All', 'Pending', 'Deferred', 'Confirmed', 'Cancelled'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChats, setSelectedChats] = useState([]);
  
  // Settings states
  const [settings, setSettings] = useState({
    reminder_msg_1: '',
    reminder_msg_2: '',
    reminder_msg_3: '',
    reminder_delay_min: 5,
    reminder_delay_max: 15
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Queue status states
  const [queueStatus, setQueueStatus] = useState({
    active: false,
    total: 0,
    sent: 0,
    failed: 0,
    currentName: '',
    logs: []
  });

  // AI Scan status states (5,000 chats capacity)
  const [aiScanStatus, setAiScanStatus] = useState({
    active: false,
    total: 0,
    processed: 0,
    failed: 0,
    logs: []
  });

  const logsEndRef = useRef(null);

  // Fetch reminder status lists
  const fetchReminders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reminder message templates & delays
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/settings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          reminder_msg_1: data.reminder_msg_1,
          reminder_msg_2: data.reminder_msg_2,
          reminder_msg_3: data.reminder_msg_3,
          reminder_delay_min: Number(data.reminder_delay_min || 5),
          reminder_delay_max: Number(data.reminder_delay_max || 15)
        });
      }
    } catch (err) {
      console.error('Failed to fetch reminder settings:', err);
    }
  };

  // Fetch queue status in background
  const fetchQueueStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/queue-status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQueueStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    }
  };

  // Fetch AI scan status in background
  const fetchAiScanStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/ai-scan-status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAiScanStatus(data);
      }
    } catch (err) {}
  };

  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  useEffect(() => {
    fetchReminders();
    fetchSettings();

    // Poll queue status & AI scan status (2s when active, 5s when idle to prevent unnecessary re-renders)
    const timer = setInterval(() => {
      fetchQueueStatus();
      fetchAiScanStatus();
      fetchReminders();
    }, queueStatus.active || aiScanStatus.active ? 2000 : 5000);

    return () => clearInterval(timer);
  }, [queueStatus.active, aiScanStatus.active]);

  const logContainerRef = useRef(null);

  const handleLogScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setUserHasScrolledUp(!isAtBottom);
  };

  // Only scroll log container internally if queue is active AND user has NOT scrolled up
  useEffect(() => {
    if (logContainerRef.current && queueStatus.active && !userHasScrolledUp) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [queueStatus.logs, queueStatus.active, userHasScrolledUp]);

  // Pause Bulk Queue
  const handlePauseQueue = async () => {
    try {
      await fetch(`${API_BASE_URL}/crm/reminders/queue-pause`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (window.notify) window.notify('info', 'Bulk reminders paused.');
    } catch (err) {}
  };

  // Resume Bulk Queue
  const handleResumeQueue = async () => {
    try {
      await fetch(`${API_BASE_URL}/crm/reminders/queue-resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (window.notify) window.notify('success', 'Bulk reminders resumed!');
    } catch (err) {}
  };

  const [timeWindow, setTimeWindow] = useState('0'); // '0', '24', '48', '168'
  const [tokenSaver, setTokenSaver] = useState(true);

  // Run AI analysis for up to 5,000 chats
  const handleAIAnalyze = async (chatIds = null) => {
    setAnalyzing(true);
    if (window.notify) window.notify('info', `Started AI Chat Analysis (${timeWindow === '0' ? 'All Time' : 'Last ' + timeWindow + ' Hours'}, Token Saver: ${tokenSaver ? 'ON' : 'OFF'})...`);
    
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          chatIds,
          maxLimit: 5000,
          hoursFilter: Number(timeWindow),
          forceRescan: !tokenSaver
        })
      });
      
      if (res.ok) {
        if (window.notify) window.notify('success', 'AI scan job started. You can track progress live on screen!');
      } else {
        const err = await res.json();
        if (window.notify) window.notify('error', err.error || 'AI analysis failed.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Network error during AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStopAiScan = async () => {
    try {
      await fetch(`${API_BASE_URL}/crm/reminders/ai-scan-stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (window.notify) window.notify('info', 'Stopping AI chat scan...');
    } catch (err) {}
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        if (window.notify) window.notify('success', 'Reminder settings saved successfully!');
      } else {
        if (window.notify) window.notify('error', 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger Bulk Send
  const handleSendBulk = async (step) => {
    if (selectedChats.length === 0) {
      if (window.notify) window.notify('warning', 'Please select at least one chat.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/crm/reminders/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          chatIds: selectedChats,
          messageStep: step,
          minDelay: settings.reminder_delay_min,
          maxDelay: settings.reminder_delay_max
        })
      });
      
      if (res.ok) {
        setSelectedChats([]);
        if (window.notify) window.notify('success', `Queued bulk sending for ${selectedChats.length} chats!`);
      } else {
        const err = await res.json();
        if (window.notify) window.notify('error', err.error || 'Failed to start bulk sending.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Stop Bulk Queue
  const handleStopQueue = async () => {
    try {
      await fetch(`${API_BASE_URL}/crm/reminders/queue-stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (window.notify) window.notify('info', 'Stopping bulk sending...');
    } catch (err) {
      console.error(err);
    }
  };

  // Filters & Counts
  const filtered = reminders.filter(r => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (r.sender_name || '').toLowerCase().includes(term);
    const phoneMatch = (r.sender_phone || '').includes(term);
    const summaryMatch = (r.ai_analysis || '').toLowerCase().includes(term);
    const textMatch = nameMatch || phoneMatch || summaryMatch;

    const rStatus = r.status || 'Pending';

    if (activeTab === 'All') return textMatch;
    if (activeTab === 'Deferred') {
      return rStatus === 'Deferred' && textMatch;
    }
    return rStatus === activeTab && textMatch;
  });

  const getCount = (tab) => {
    if (tab === 'All') return reminders.length;
    return reminders.filter(r => (r.status || 'Pending') === tab).length;
  };

  const selectAll = () => {
    if (selectedChats.length === filtered.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(filtered.map(f => f.id));
    }
  };

  const toggleSelectChat = (id) => {
    setSelectedChats(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Stats
  const totalRecovered = reminders.filter(r => r.status === 'Confirmed').length;
  const totalDeferred = reminders.filter(r => r.status === 'Deferred').length;
  const totalCancelled = reminders.filter(r => r.status === 'Cancelled').length;
  const pendingRecovery = reminders.filter(r => r.status === 'Pending').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Recurring Customer Reminders</h2>
          <p className="text-sm text-gray-500">Scan customer messages, run AI intent analysis, and recover postponed sales safely.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Window Filter Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-xs">
            <i className="las la-calendar text-gray-400 text-sm"></i>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="0">All Time History</option>
              <option value="24">Active Last 24 Hours</option>
              <option value="48">Active Last 48 Hours</option>
              <option value="168">Active Last 7 Days</option>
            </select>
          </div>

          {/* Token Saver Mode Toggle */}
          <label className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tokenSaver}
              onChange={(e) => setTokenSaver(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Token Saver</span>
          </label>

          <button
            onClick={() => handleAIAnalyze()}
            disabled={analyzing}
            className={`btn btn--primary px-4 py-2.5 dash-v2-cta-btn flex items-center gap-2 border-none active:scale-[0.98] rounded-xl font-bold text-xs cursor-pointer ${analyzing ? 'opacity-65' : ''}`}
          >
            {analyzing ? (
              <>
                <i className="las la-spinner la-spin mr-1"></i>
                Analyzing...
              </>
            ) : (
              <>
                <i className="las la-robot mr-1"></i>
                AI Scan Chats ({timeWindow === '0' ? '5000 Max' : timeWindow + 'h'})
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Scan Progress Banner */}
      {aiScanStatus.active && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">AI Scan Active (Scanning up to 5,000 Chats)</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300">Progress: <strong className="text-white">{aiScanStatus.processed} / {aiScanStatus.total}</strong> chats</span>
              <span className="text-slate-400">{Math.round((aiScanStatus.processed / (aiScanStatus.total || 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300" 
                style={{ width: `${(aiScanStatus.processed / (aiScanStatus.total || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
          <button
            onClick={handleStopAiScan}
            className="btn btn-sm btn-danger text-xs px-4 py-2 border-none rounded-xl font-bold cursor-pointer shrink-0"
          >
            <i className="las la-stop-circle mr-1"></i> Stop Scan
          </button>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Recovered Orders</span>
          <span className="text-2xl font-extrabold text-[#00832e] mt-1">{totalRecovered}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Promised / Later</span>
          <span className="text-2xl font-extrabold text-amber-500 mt-1">{totalDeferred}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Cancelled / No Need</span>
          <span className="text-2xl font-extrabold text-rose-500 mt-1">{totalCancelled}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Pending Reminders</span>
          <span className="text-2xl font-extrabold text-slate-500 mt-1">{pendingRecovery}</span>
        </div>
      </div>

      {/* Main Grid: Settings & Queue Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Templates and Delays Configuration */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-gray-100 bg-white shadow-xs">
          <h4 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
            <i className="las la-cog text-[#00832e] text-lg"></i>
            Follow-Up & Anti-Spam Settings
          </h4>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 d-block">1st Reminder Message (Initial follow-up)</label>
                <textarea
                  value={settings.reminder_msg_1}
                  onChange={(e) => setSettings({ ...settings, reminder_msg_1: e.target.value })}
                  placeholder="Leave empty to use system default..."
                  rows={2}
                  className="w-100 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 d-block">2nd Reminder Message (Drip incentive/Offer)</label>
                <textarea
                  value={settings.reminder_msg_2}
                  onChange={(e) => setSettings({ ...settings, reminder_msg_2: e.target.value })}
                  placeholder="Leave empty to use system default..."
                  rows={2}
                  className="w-100 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 d-block">3rd Reminder Message (Final warning)</label>
                <textarea
                  value={settings.reminder_msg_3}
                  onChange={(e) => setSettings({ ...settings, reminder_msg_3: e.target.value })}
                  placeholder="Leave empty to use system default..."
                  rows={2}
                  className="w-100 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
            </div>

            {/* Delays Configuration */}
            <div className="row gy-3">
              <div className="col-6">
                <label className="text-xs font-bold text-gray-500 mb-1 d-block">Min Delay (seconds)</label>
                <input
                  type="number"
                  min={1}
                  value={settings.reminder_delay_min}
                  onChange={(e) => setSettings({ ...settings, reminder_delay_min: Number(e.target.value) })}
                  className="w-100 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
              <div className="col-6">
                <label className="text-xs font-bold text-gray-500 mb-1 d-block">Max Delay (seconds)</label>
                <input
                  type="number"
                  min={settings.reminder_delay_min}
                  value={settings.reminder_delay_max}
                  onChange={(e) => setSettings({ ...settings, reminder_delay_max: Number(e.target.value) })}
                  className="w-100 border border-gray-200 rounded-xl p-2.5 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="btn btn--base py-2.5 px-4 w-100 border-none rounded-xl font-bold cursor-pointer transition-transform"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Real-time Queue Logger Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-100 bg-[#1e293b] text-[#f8fafc] shadow-xs flex flex-column justify-content-between">
          <div>
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="las la-paper-plane text-emerald-400 text-lg"></i>
              Spam Shield Active Queue
            </h4>
            
            {/* Live Batch Dispatch Metric Cards */}
            {(queueStatus.active || queueStatus.logs.length > 0) && (
              <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
                <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                  <span className="text-[8px] uppercase font-bold text-slate-400 d-block">Target</span>
                  <span className="text-xs font-extrabold text-white">{queueStatus.total}</span>
                </div>
                <div className="bg-emerald-950/60 p-1.5 rounded-xl border border-emerald-800/50">
                  <span className="text-[8px] uppercase font-bold text-emerald-400 d-block">Sent</span>
                  <span className="text-xs font-extrabold text-emerald-400">{queueStatus.sent}</span>
                </div>
                <div className="bg-rose-950/60 p-1.5 rounded-xl border border-rose-800/50">
                  <span className="text-[8px] uppercase font-bold text-rose-400 d-block">Failed</span>
                  <span className="text-xs font-extrabold text-rose-400">{queueStatus.failed}</span>
                </div>
                <div className="bg-amber-950/60 p-1.5 rounded-xl border border-amber-800/50">
                  <span className="text-[8px] uppercase font-bold text-amber-400 d-block">Success %</span>
                  <span className="text-xs font-extrabold text-amber-400">
                    {queueStatus.total > 0 ? Math.round((queueStatus.sent / queueStatus.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}

            {queueStatus.active ? (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Sending to: <span className="font-bold text-[#f8fafc]">{queueStatus.currentName}</span></p>
                <div className="d-flex align-items-center gap-2">
                  <div className="progress flex-grow-1" style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${(queueStatus.sent / (queueStatus.total || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-[#f8fafc]">{queueStatus.sent}/{queueStatus.total}</span>
                </div>
              </div>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-slate-800 text-xs mb-3 text-slate-400 flex justify-between items-center">
                <span>🚀 Queue idle. Select chats below and click send.</span>
                {queueStatus.logs.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(queueStatus.logs.join('\n'));
                      if (window.notify) window.notify('success', 'Execution report copied to clipboard!');
                    }}
                    className="text-[10px] text-emerald-400 font-bold bg-transparent border-none cursor-pointer hover:underline"
                  >
                    Copy Report
                  </button>
                )}
              </div>
            )}

            {/* Log Output Display Console */}
            <div 
              ref={logContainerRef}
              onScroll={handleLogScroll}
              style={{
                height: '190px',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '12px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#34d399'
              }}
            >
              {queueStatus.logs.length === 0 ? (
                <div className="text-center text-slate-500 py-5">[Queue output empty]</div>
              ) : (
                queueStatus.logs.map((log, index) => (
                  <div key={index} className="mb-1 leading-normal">{log}</div>
                ))
              )}
            </div>
          </div>

          {queueStatus.active && (
            <div className="flex gap-2 mt-3">
              {queueStatus.paused ? (
                <button
                  onClick={handleResumeQueue}
                  className="btn btn-sm btn-success flex-1 py-2 border-none rounded-xl font-bold cursor-pointer active:scale-95 transition-transform"
                >
                  <i className="las la-play-circle mr-1"></i> Resume Queue
                </button>
              ) : (
                <button
                  onClick={handlePauseQueue}
                  className="btn btn-sm btn-warning flex-1 py-2 border-none rounded-xl text-dark font-bold cursor-pointer active:scale-95 transition-transform"
                >
                  <i className="las la-pause-circle mr-1"></i> Pause Queue
                </button>
              )}
              <button
                onClick={handleStopQueue}
                className="btn btn-sm btn-danger flex-1 py-2 border-none rounded-xl font-bold cursor-pointer active:scale-95 transition-transform"
              >
                <i className="las la-stop-circle mr-1"></i> Stop Queue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reminders List Section */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-100 bg-white shadow-xs">
        
        {/* Search, Tabs Filter and Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {['Pending', 'Deferred', 'Confirmed', 'Cancelled', 'All'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedChats([]); }}
                className={`py-1.5 px-3 rounded-pill text-xs font-bold cursor-pointer border-none transition-all ${
                  activeTab === tab 
                    ? 'bg-[#00832e] text-white' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab === 'Pending' ? 'Pending Reminders' 
                 : tab === 'Deferred' ? 'Deferred (Tomorrow/Later)' 
                 : tab === 'Confirmed' ? 'Recovered' 
                 : tab === 'Cancelled' ? 'Cancelled' : 'All'} ({getCount(tab)})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-100 md:w-auto">
            <button
              onClick={() => {
                const pendingIds = filtered.filter(f => (f.status || 'Pending') === 'Pending').map(f => f.id);
                setSelectedChats(pendingIds);
                if (window.notify) window.notify('info', `Selected ${pendingIds.length} pending chats.`);
              }}
              className="btn btn-sm btn-outline-success text-xs py-1.5 px-3 rounded-xl font-bold cursor-pointer shrink-0"
            >
              <i className="las la-check-circle mr-1"></i> Select Pending ({filtered.filter(f => (f.status || 'Pending') === 'Pending').length})
            </button>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs w-100 md:w-56"
            />
          </div>
        </div>

        {/* Selected Chats Bulk Send Action Buttons */}
        {selectedChats.length > 0 && (
          <div className="bg-[#e6f4ea] text-[#00832e] rounded-xl px-4 py-3 mb-4 d-flex justify-content-between align-items-center gap-3">
            <span className="text-xs font-bold">Selected {selectedChats.length} chats for reminders</span>
            <div className="d-flex gap-2">
              <button 
                onClick={() => handleSendBulk(1)} 
                className="btn btn-sm btn--base-two text-xs py-1.5 px-3 rounded-lg border-none cursor-pointer"
              >
                Send 1st Follow-Up
              </button>
              <button 
                onClick={() => handleSendBulk(2)} 
                className="btn btn-sm btn--base-two text-xs py-1.5 px-3 rounded-lg border-none cursor-pointer"
              >
                Send 2nd Follow-Up
              </button>
              <button 
                onClick={() => handleSendBulk(3)} 
                className="btn btn-sm btn--base-two text-xs py-1.5 px-3 rounded-lg border-none cursor-pointer"
              >
                Send Final Follow-Up
              </button>
              <button
                onClick={() => handleAIAnalyze(selectedChats)}
                disabled={analyzing}
                className="btn btn-sm btn--dark text-xs py-1.5 px-3 rounded-lg border-none cursor-pointer"
              >
                Run AI Scan
              </button>
            </div>
          </div>
        )}

        {/* Reminders Table */}
        <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table className="table table--responsive--lg">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '40px' }} className="p-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedChats.length === filtered.length}
                    onChange={selectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold">Contact Name</th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold">Last Message</th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold">AI Intent Summary</th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold text-center">Status</th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold text-center">Reminded</th>
                <th className="p-3 text-xs uppercase text-gray-500 font-bold text-center">Promises</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <i className="las la-spinner la-spin fs-4 text-[#00832e] mr-2"></i>
                    Loading reminders list...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-gray-400 text-sm">
                    No matching customer reminder data found in this category.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const hasReminder = item.status;
                  const isSelected = selectedChats.includes(item.id);
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 transition-colors border-bottom border-neutral-100 ${isSelected ? 'bg-emerald-50/20' : ''}`}
                    >
                      <td className="p-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectChat(item.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <span className="font-bold text-neutral-800 text-sm d-block">{item.sender_name}</span>
                        <span className="text-xs text-gray-400">+{item.sender_phone}</span>
                      </td>
                      <td className="p-3 align-middle" style={{ maxWidth: '220px' }}>
                        <p className="text-xs text-neutral-600 truncate mb-0" title={item.last_message}>
                          {item.last_message || '[No messages logged]'}
                        </p>
                        <span className="text-[10px] text-gray-400 d-block mt-0.5">
                          {new Date(item.updated_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 align-middle" style={{ maxWidth: '240px' }}>
                        <p className="text-xs text-slate-700 italic mb-0" title={item.ai_analysis}>
                          {item.ai_analysis ? `"${item.ai_analysis}"` : (
                            <span className="text-gray-400">[Need AI Scan]</span>
                          )}
                        </p>
                      </td>
                      <td className="p-3 align-middle text-center">
                        <span className={`badge rounded-pill text-[10px] px-2 py-1 font-bold ${
                          item.status === 'Confirmed' ? 'bg-success text-white'
                          : item.status === 'Deferred' ? 'bg-warning text-dark'
                          : item.status === 'Cancelled' ? 'bg-danger text-white'
                          : 'bg-secondary text-white'
                        }`}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 align-middle text-center">
                        <span className="text-xs font-bold text-slate-700">
                          {item.reminder_count || 0} times
                        </span>
                        {item.last_reminder_sent_at && (
                          <span className="text-[9px] text-gray-400 d-block">
                            Last: {new Date(item.last_reminder_sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 align-middle text-center">
                        <span className="text-xs text-amber-600 font-bold">
                          {item.deferred_date ? new Date(item.deferred_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

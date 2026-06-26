import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Smartphone, 
  Cpu, 
  LogOut, 
  Settings, 
  Activity, 
  Search, 
  Shield, 
  Edit3, 
  Save,
  CheckCircle,
  AlertTriangle,
  Database,
  CreditCard,
  FileText
} from 'lucide-react';
import { API_BASE_URL } from '../config';

function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'sessions', 'ai-config'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [usersList, setUsersList] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalSessions: 0,
    activeSessions: 0,
    nodeHealth: 'Healthy',
    memoryUsage: '0 MB',
    uptime: '0s'
  });

  const [aiConfig, setAiConfig] = useState({
    defaultModel: 'Gemini 1.5 Pro',
    systemPrompt: '',
    temperature: 0.6,
    typingDelayMultiplier: 150, // ms per word
    globalAIActive: true,
  });

  const [isSaved, setIsSaved] = useState(false);

  const [transactionsList, setTransactionsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Poll system details and load from DB
  useEffect(() => {
    // 1. Fetch AI config
    fetch(`${API_BASE_URL}/ai-config`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setAiConfig({
          defaultModel: data.defaultModel || 'Gemini 1.5 Pro',
          systemPrompt: data.systemPrompt || '',
          temperature: data.temperature || 0.6,
          typingDelayMultiplier: data.typingDelay || 150,
          globalAIActive: data.globalAIActive !== false
        });
      })
      .catch(err => console.warn('Failed to load AI config in Admin:', err.message));

    const fetchOverview = () => {
      fetch(`${API_BASE_URL}/admin/overview`)
        .then(res => res.json())
        .then(data => setMetrics(data))
        .catch(err => console.warn(err));
    };

    const fetchUsers = () => {
      fetch(`${API_BASE_URL}/admin/users`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setUsersList(data);
        })
        .catch(err => console.warn(err));
    };

    const fetchSessions = () => {
      fetch(`${API_BASE_URL}/admin/sessions`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setActiveSessions(data);
        })
        .catch(err => console.warn(err));
    };

    fetchOverview();
    fetchUsers();
    fetchSessions();

    const interval = setInterval(() => {
      fetchOverview();
      fetchUsers();
      fetchSessions();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch lists on active tab changes
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetch(`${API_BASE_URL}/admin/transactions`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTransactionsList(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'audit-logs') {
      fetch(`${API_BASE_URL}/admin/audit-logs`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAuditLogs(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'ai-config') {
      fetch(`${API_BASE_URL}/admin/system-settings`)
        .then(res => res.json())
        .then(data => {
          if (data && data.geminiApiKey !== undefined) {
            setGeminiApiKey(data.geminiApiKey);
          }
        })
        .catch(err => console.warn(err));
    }
  }, [activeTab]);

  const handleSaveGeminiKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ geminiApiKey })
      });
      if (res.ok) {
        setIsApiKeySaved(true);
        setTimeout(() => setIsApiKeySaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePlan = async (userId, newPlan) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: newPlan })
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUsersList(prev => prev.map(u => {
          if (u.id === userId) {
            return { ...u, status: data.nextStatus };
          }
          return u;
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const terminateSession = async (sessionId) => {
    if (!confirm('Are you sure you want to terminate this WhatsApp session?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sessions/${sessionId}/terminate`, { method: 'POST' });
      if (res.ok) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAIConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/ai-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          defaultModel: aiConfig.defaultModel,
          systemPrompt: aiConfig.systemPrompt,
          temperature: aiConfig.temperature,
          typingDelay: aiConfig.typingDelayMultiplier,
          globalAIActive: aiConfig.globalAIActive
        })
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load stylesheet references to make sure admin matches dashboard styling themes
  useEffect(() => {
    document.title = 'WhatsRay - System Admin Portal';
  }, []);

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-[#111111] font-sans antialiased overflow-hidden">
      
      {/* ── Left Sidebar ── */}
      <div className="w-64 bg-[#0d120f] flex flex-col justify-between p-6">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-[#00832e]"></span>
            <span className="text-white font-black tracking-wider text-xl uppercase">WhatsRay Admin</span>
          </div>

          {/* Sidebar Tabs */}
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'overview' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <Activity className="w-4 h-4" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'users' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <Users className="w-4 h-4" />
              User Accounts
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'sessions' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <Smartphone className="w-4 h-4" />
              WhatsApp Sessions
            </button>
            <button 
              onClick={() => setActiveTab('ai-config')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'ai-config' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <Cpu className="w-4 h-4" />
              Global AI Config
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'transactions' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <CreditCard className="w-4 h-4" />
              Billing & Payments
            </button>
            <button 
              onClick={() => setActiveTab('audit-logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'audit-logs' ? 'bg-[#00832e] text-white shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
            >
              <FileText className="w-4 h-4" />
              System Audit Logs
            </button>
          </nav>
        </div>

        {/* Admin User Info & LogOut */}
        <div className="border-t border-neutral-800 pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white uppercase">
              SA
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wider">{admin?.name}</p>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{admin?.role}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all border border-transparent hover:border-red-900/30"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header bar */}
        <header className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between shadow-sm">
          <h1 className="font-black text-lg tracking-tight uppercase text-neutral-800">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4 text-xs font-bold tracking-wider text-neutral-500 uppercase">
            <span>System Status:</span>
            <span className="flex items-center gap-1.5 text-[#00832e]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00832e] animate-pulse"></span>
              Operational
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* 1. OVERVIEW VIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Total Active Users</span>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-[#00832e]"><Users className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{metrics.totalUsers}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Active portal users</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Linked WhatsApps</span>
                    <div className="p-3 rounded-2xl bg-[#00832e]/10 text-[#00832e]"><Smartphone className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{metrics.totalSessions}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">WhatsApp sessions configured</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">AI Responder Calls</span>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Cpu className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{metrics.activeSessions}</h2>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-2">Connected active sockets</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Database Uptime</span>
                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600"><Database className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{metrics.memoryUsage}</h2>
                  <p className="text-[10px] text-purple-600 font-bold uppercase mt-2">Process Heap Uptime: {metrics.uptime}</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">System Service Audits</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00832e]"></span>
                        <p className="text-sm font-bold">Node.js Webhook Controller</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-[#00832e] font-black uppercase px-2.5 py-1 rounded-full">Healthy</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00832e]"></span>
                        <p className="text-sm font-bold">WhatsApp Session Manager (Baileys daemon)</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-[#00832e] font-black uppercase px-2.5 py-1 rounded-full">Healthy</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00832e]"></span>
                        <p className="text-sm font-bold">AES-256 Encryption Engine</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-[#00832e] font-black uppercase px-2.5 py-1 rounded-full">Healthy</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00832e]"></span>
                        <p className="text-sm font-bold">AI LLM Connector API</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-[#00832e] font-black uppercase px-2.5 py-1 rounded-full">Healthy</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-4 h-4 text-[#00832e]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Database Security Panel</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-light mb-4">
                      All connected clients session keys are isolated and encrypted via Node.js internal Crypto engine. Credentials stored in Mongo DB remain secure through continuous salting.
                    </p>
                  </div>
                  <div className="bg-[#f4f6f8] p-4 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-[9px]">Encryption Key</span>
                    <span className="font-mono bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-neutral-700">AES-256-GCM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS MANAGEMENT VIEW */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-[#f4f6f8] px-4 py-3 rounded-2xl w-full max-w-md">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by name or email..." 
                  className="bg-transparent w-full text-sm border-none outline-none focus:ring-0 placeholder-gray-400"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      <th className="py-4">Name</th>
                      <th className="py-4">Email</th>
                      <th className="py-4">Subscription</th>
                      <th className="py-4 text-center">Connected sessions</th>
                      <th className="py-4">Joined Date</th>
                      <th className="py-4">Status</th>
                      <th className="py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                        <td className="py-4 font-bold text-neutral-800">{u.name}</td>
                        <td className="py-4 text-neutral-500">{u.email}</td>
                        <td className="py-4">
                          <select
                            value={u.plan}
                            onChange={(e) => handleUpdatePlan(u.id, e.target.value)}
                            className="bg-[#f4f6f8] px-2.5 py-1.5 rounded-xl text-xs font-bold text-neutral-800 border border-gray-200 focus:outline-none"
                          >
                            <option value="Free">Free</option>
                            <option value="Premium">Premium</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="py-4 text-center font-bold text-neutral-800">{u.sessions}</td>
                        <td className="py-4 text-neutral-500">{new Date(u.joined).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${u.status === 'Active' ? 'text-[#00832e]' : 'text-red-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-[#00832e]' : 'bg-red-500'}`}></span>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => toggleUserStatus(u.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                              u.status === 'Active' 
                                ? 'border border-red-200 text-red-500 hover:bg-red-50' 
                                : 'border border-emerald-200 text-[#00832e] hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. SESSIONS LOGS VIEW */}
          {activeTab === 'sessions' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      <th className="py-4">Session ID</th>
                      <th className="py-4">User Account</th>
                      <th className="py-4">Linked Number</th>
                      <th className="py-4">Daemon Library</th>
                      <th className="py-4">Uptime</th>
                      <th className="py-4">Memory Cache</th>
                      <th className="py-4">Session Security</th>
                      <th className="py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                        <td className="py-4 font-mono text-xs text-neutral-400">{s.id}</td>
                        <td className="py-4 font-bold text-neutral-800">{s.userId}</td>
                        <td className="py-4 font-mono text-neutral-800">{s.phone}</td>
                        <td className="py-4 text-neutral-500">{s.library}</td>
                        <td className="py-4 text-neutral-500">{s.uptime}</td>
                        <td className="py-4 font-mono text-xs">{s.memory}</td>
                        <td className="py-4">
                          <span className="flex items-center gap-1.5 text-xs text-[#00832e] font-bold">
                            <Shield className="w-3.5 h-3.5" />
                            {s.encryption}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            disabled={s.status === 'Disconnected'}
                            onClick={() => terminateSession(s.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                              s.status === 'Connected' 
                                ? 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100' 
                                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {s.status === 'Connected' ? 'Kill Session' : 'Terminated'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. AI CONFIGURATION VIEW */}
          {activeTab === 'ai-config' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Settings Form */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <form onSubmit={handleSaveAIConfig} className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#00832e]" /> Global AI Model Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Default Response Model</label>
                      <select 
                        value={aiConfig.defaultModel}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, defaultModel: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                      >
                        <option>Gemini 1.5 Pro</option>
                        <option>OpenAI GPT-4o</option>
                        <option>OpenAI GPT-3.5 Turbo</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">System Model Temperature</label>
                      <div className="flex items-center gap-3 mt-2">
                        <input 
                          type="range" 
                          min="0.1" 
                          max="1.0" 
                          step="0.1"
                          value={aiConfig.temperature}
                          onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full accent-black cursor-pointer"
                        />
                        <span className="font-mono text-sm border border-gray-200 px-2 py-1 rounded bg-gray-50">{aiConfig.temperature}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Human-Like Typing Delay (ms per word)</label>
                    <input 
                      type="number"
                      value={aiConfig.typingDelayMultiplier}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, typingDelayMultiplier: parseInt(e.target.value, 10) }))}
                      className="w-full max-w-xs px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                      placeholder="150"
                    />
                    <small className="text-gray-400 d-block mt-1 font-light">Calculates type timing dynamically (e.g. 20 words = 3 seconds delay with typing indicator).</small>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Base Agent Persona System Prompt</label>
                    <textarea 
                      rows="6"
                      value={aiConfig.systemPrompt}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors font-light leading-relaxed text-neutral-600"
                    ></textarea>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={aiConfig.globalAIActive}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, globalAIActive: e.target.checked }))}
                        className="w-4 h-4 accent-black rounded border-gray-200 focus:ring-0"
                        id="global-ai"
                      />
                      <label htmlFor="global-ai" className="text-xs font-bold uppercase tracking-wider text-neutral-700 cursor-pointer">Activate AI Agent Engine Globally</label>
                    </div>

                    <button 
                      type="submit"
                      className="bg-black text-white hover:bg-neutral-800 transition-all px-6 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center gap-2"
                    >
                      {isSaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                      {isSaved ? 'Saved!' : 'Save System Prompt'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick Info */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-neutral-800">
                    <Shield className="w-5 h-5 text-[#00832e]" />
                    <h4 className="text-sm font-black uppercase tracking-wider">Global Gemini API Key</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    Set the global Gemini API Key used by all user bots across the platform. Regular users cannot see or edit this key.
                  </p>
                  <form onSubmit={handleSaveGeminiKey} className="space-y-3 pt-2">
                    <input 
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none"
                    />
                    <button 
                      type="submit"
                      className="w-full bg-black text-white hover:bg-neutral-800 transition-all py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2"
                    >
                      {isApiKeySaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                      {isApiKeySaved ? 'Saved API Key!' : 'Save API Key'}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-neutral-800">
                    <Cpu className="w-5 h-5 text-[#00832e]" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Prompt Injector Model</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    This default prompt template is injected into user sessions if they do not customize their specific bot prompts. You can test prompts inside the user sandbox before applying system wide.
                  </p>
                </div>

                <div className="bg-amber-50/50 border border-amber-200/50 rounded-3xl p-6 space-y-4 text-amber-800">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">System Safety Warning</h4>
                  </div>
                  <p className="text-xs leading-relaxed font-light text-amber-700">
                    Overwriting global configurations will refresh the system prompt mapping for all uncustomized user bots on their next incoming webhook message. Please verify parameter syntax.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. BILLING & TRANSACTIONS VIEW */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Billing History Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      <th className="py-4">Transaction ID</th>
                      <th className="py-4">User</th>
                      <th className="py-4">Email</th>
                      <th className="py-4">Stripe Session ID</th>
                      <th className="py-4">Plan upgraded</th>
                      <th className="py-4">Amount</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 font-light">No billing records found.</td>
                      </tr>
                    ) : (
                      transactionsList.map(tx => (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                          <td className="py-4 font-bold text-neutral-800">#{tx.id}</td>
                          <td className="py-4 font-bold text-neutral-800">{tx.user_name || 'N/A'}</td>
                          <td className="py-4 text-neutral-500">{tx.user_email || 'N/A'}</td>
                          <td className="py-4 font-mono text-xs text-neutral-400">{tx.stripe_session_id}</td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-[#00832e]">
                              {tx.plan}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-neutral-800 font-bold">
                            රු {parseFloat(tx.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>{tx.status}</span>
                          </td>
                          <td className="py-4 text-neutral-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. SYSTEM AUDIT LOGS VIEW */}
          {activeTab === 'audit-logs' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Administrative Audit Trails</h3>
                <span className="text-[10px] bg-red-50 text-red-500 font-black uppercase px-2.5 py-1 rounded-full">Secure Log Stream</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      <th className="py-4">Log ID</th>
                      <th className="py-4">Action Event</th>
                      <th className="py-4">Description details</th>
                      <th className="py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-400 font-light">No audit log records stream is currently active.</td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                          <td className="py-4 font-mono text-xs text-neutral-400">#{log.id}</td>
                          <td className="py-4 font-bold text-neutral-800">
                            <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-neutral-800 font-bold uppercase tracking-wider">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 text-neutral-600 font-light">{log.details}</td>
                          <td className="py-4 text-neutral-500 text-xs font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}

export default AdminDashboard;

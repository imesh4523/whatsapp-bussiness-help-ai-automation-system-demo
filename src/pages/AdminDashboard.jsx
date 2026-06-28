import React, { useState, useEffect, useCallback } from 'react';
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
  FileText,
  MessageSquare,
  LifeBuoy,
  Mail,
  Gift,
  Trash2,
  Globe,
  Play,
  RefreshCw,
  Info,
  Key,
  Server,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config';

// ── Premium Toast Notification System for Admin ──────────────────────────────
let _toastDispatchAdmin = null;

const TOAST_ICONS = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

const TOAST_COLORS = {
  success: { bg: '#10b981', border: '#e6f4ea', text: '#065f46', iconBg: '#e6f4ea', icon: '#10b981' },
  error:   { bg: '#ef4444', border: '#fce8e6', text: '#9b1c1c', iconBg: '#fce8e6', icon: '#ef4444' },
  info:    { bg: '#3b82f6', border: '#e8f0fe', text: '#1e40af', iconBg: '#e8f0fe', icon: '#3b82f6' },
  warning: { bg: '#f59e0b', border: '#fef3c7', text: '#92400e', iconBg: '#fef3c7', icon: '#f59e0b' },
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _toastDispatchAdmin = (type, message, duration = 4500) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, type, message, duration, visible: true }]);
    };
    window.notify = _toastDispatchAdmin;
    return () => { _toastDispatchAdmin = null; };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px',
      zIndex: 9999999, display: 'flex', flexDirection: 'column', gap: '12px',
      pointerEvents: 'none', width: '360px',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  const c = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        pointerEvents: 'all',
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 18px',
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transform: mounted && !toast.leaving ? 'translateX(0) scale(1)' : 'translateX(45px) scale(0.95)',
        opacity: mounted && !toast.leaving ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform, opacity',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: c.bg,
      }} />

      <div style={{
        flexShrink: 0,
        width: '36px', height: '36px',
        borderRadius: '50%',
        background: c.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: c.icon,
      }}
        dangerouslySetInnerHTML={{ __html: TOAST_ICONS[toast.type] || TOAST_ICONS.info }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: c.text, marginBottom: '2px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : toast.type === 'warning' ? 'Warning' : 'Info'}
        </div>
        <div style={{
          fontSize: '13px', color: '#475569',
          lineHeight: '1.4', fontWeight: '500',
          fontFamily: 'Inter, system-ui, sans-serif',
          wordBreak: 'break-word',
        }}>
          {toast.message}
        </div>
      </div>

      <div style={{
        flexShrink: 0, color: '#94a3b8',
        fontSize: '14px', lineHeight: 1, padding: '4px',
        transition: 'color 0.2s',
      }}>✕</div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'rgba(0,0,0,0.03)',
      }}>
        <div style={{
          height: '100%',
          background: c.bg,
          animation: `toastProgress ${toast.duration}ms linear forwards`,
        }} />
      </div>
    </div>
  );
}

function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'sessions', 'ai-config'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allSavedCards, setAllSavedCards] = useState([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState({
    duplicateWhatsapps: [],
    duplicateCards: []
  });
  
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
  const [plansList, setPlansList] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanForm, setEditPlanForm] = useState({
    name: '',
    price: 0,
    responseLimit: 500,
    features: '',
    disabledFeatures: ''
  });
  const [renamingSessionId, setRenamingSessionId] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  const renameSessionAdmin = async (sessionId) => {
    if (!renameVal.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/whatsapp/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ session_name: renameVal })
      });
      if (res.ok) {
        setRenamingSessionId(null);
        setRenameVal('');
        if (window.fetchSessionsAdmin) window.fetchSessionsAdmin();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [transactionsList, setTransactionsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Google Login configuration states
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('');
  const [googleAuthActive, setGoogleAuthActive] = useState(false);
  const [isGoogleSaved, setIsGoogleSaved] = useState(false);

  // Coupons configuration states
  const [couponsList, setCouponsList] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPlan, setNewCouponPlan] = useState('Pro');
  const [newCouponDays, setNewCouponDays] = useState(30);
  const [newCouponExpires, setNewCouponExpires] = useState('');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('');

  // Domain & Email Config States
  const [domainConfig, setDomainConfig] = useState({
    domainName: '',
    cloudflareZoneId: '',
    cloudflareApiToken: '',
    resendApiKey: '',
    emailSender: '',
    emailSenderName: 'AgentBunny'
  });
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configResult, setConfigResult] = useState(null); // 'success' | 'error' | null
  const [domainStatus, setDomainStatus] = useState(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Edit User Profile Modal States
  const [editingUser, setEditingUser] = useState(null);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSizesInfo, setEditSizesInfo] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editTemperature, setEditTemperature] = useState(0.6);
  const [editTypingDelay, setEditTypingDelay] = useState(150);
  const [editDefaultModel, setEditDefaultModel] = useState('Gemini 1.5 Pro');

  // Support Tickets States
  const [ticketsList, setTicketsList] = useState([]);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState(null);
  const [adminTicketReplies, setAdminTicketReplies] = useState([]);
  const [adminReplyMsg, setAdminReplyMsg] = useState('');
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);

  // SaaS Admin States
  const [revenueStats, setRevenueStats] = useState({ total_revenue: 0, mrr: 0 });
  const [aiUsageStats, setAiUsageStats] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });
  const [maintenanceActive, setMaintenanceActive] = useState(false);

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

    window.fetchSessionsAdmin = fetchSessions;

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

  useEffect(() => {
    setSearchQuery('');
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
          if (data) {
            if (data.geminiApiKey !== undefined) setGeminiApiKey(data.geminiApiKey);
            if (data.googleClientId !== undefined) setGoogleClientId(data.googleClientId);
            if (data.googleClientSecret !== undefined) setGoogleClientSecret(data.googleClientSecret);
            if (data.googleRedirectUri !== undefined) setGoogleRedirectUri(data.googleRedirectUri);
            if (data.googleAuthActive !== undefined) setGoogleAuthActive(data.googleAuthActive);
          }
        })
        .catch(err => console.warn(err));
    } else if (activeTab === 'domain-config') {
      fetch(`${API_BASE_URL}/admin/domain/settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data) {
            setDomainConfig({
              domainName: data.domainName || '',
              cloudflareZoneId: data.cloudflareZoneId || '',
              cloudflareApiToken: data.cloudflareApiToken || '',
              resendApiKey: data.resendApiKey || '',
              emailSender: data.emailSender || '',
              emailSenderName: data.emailSenderName || 'AgentBunny'
            });
          }
        })
        .catch(err => console.warn(err));

      fetch(`${API_BASE_URL}/admin/domain/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data) setDomainStatus(data);
        })
        .catch(err => console.warn(err));
    } else if (activeTab === 'coupons') {
      fetch(`${API_BASE_URL}/admin/coupons`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setCouponsList(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'user-cards') {
      fetch(`${API_BASE_URL}/admin/payments/methods`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAllSavedCards(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'suspicious') {
      fetch(`${API_BASE_URL}/admin/suspicious-activity`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => { if (data && !data.error) setSuspiciousActivities(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'tickets') {
      fetchTicketsAdmin();
    } else if (activeTab === 'overview') {
      fetch(`${API_BASE_URL}/admin/settings/maintenance`)
        .then(res => res.json())
        .then(data => setMaintenanceActive(data.active))
        .catch(err => console.warn(err));

      fetch(`${API_BASE_URL}/admin/revenue-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => { if (data && !data.error) setRevenueStats(data); })
        .catch(err => console.warn(err));

      fetch(`${API_BASE_URL}/admin/ai-usage`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAiUsageStats(data); })
        .catch(err => console.warn(err));
    } else if (activeTab === 'email-templates') {
      fetchEmailTemplates();
    } else if (activeTab === 'plans') {
      fetch(`${API_BASE_URL}/plans`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setPlansList(data); })
        .catch(err => console.warn(err));
    }
  }, [activeTab]);

  // ── Support Tickets Handlers ───────────────────────────────────────────────
  const fetchTicketsAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTicketsList(data);
      }
    } catch (e) {
      console.error('Failed to fetch admin tickets:', e);
    }
  };

  const fetchTicketDetailsAdmin = async (ticketId) => {
    try {
      setLoadingTicketDetails(true);
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAdminTicket(data.ticket);
        setAdminTicketReplies(data.replies);
      }
    } catch (e) {
      console.error('Failed to fetch ticket details:', e);
    } finally {
      setLoadingTicketDetails(false);
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyMsg.trim() || !selectedAdminTicket) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${selectedAdminTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ message: adminReplyMsg })
      });
      if (res.ok) {
        setAdminReplyMsg('');
        fetchTicketDetailsAdmin(selectedAdminTicket.id);
        fetchTicketsAdmin();
        if (window.notifyAdmin) window.notifyAdmin('success', 'Reply posted successfully!');
      }
    } catch (e) {
      console.error('Failed to post reply:', e);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        fetchTicketDetailsAdmin(ticketId);
        fetchTicketsAdmin();
        if (window.notifyAdmin) window.notifyAdmin('success', 'Ticket marked as Closed!');
      }
    } catch (e) {
      console.error('Failed to close ticket:', e);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/email-templates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/email-templates/${selectedTemplate.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(templateForm)
      });
      if (res.ok) {
        setSelectedTemplate(null);
        fetchEmailTemplates();
        if (window.notifyAdmin) window.notifyAdmin('success', 'Email template updated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMaintenance = async (active) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ active })
      });
      if (res.ok) {
        setMaintenanceActive(active);
        if (window.notifyAdmin) window.notifyAdmin('success', `Maintenance mode turned ${active ? 'ON' : 'OFF'}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImpersonateUser = async (userId) => {
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      if (window.notifyAdmin) window.notifyAdmin('error', 'Please allow popups to use Impersonation Mode');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const currentToken = localStorage.getItem('aura_token');
        const impersonateUrl = `/user/dashboard?impersonate_token=${data.token}&admin_token=${currentToken}&user_data=${encodeURIComponent(JSON.stringify(data.user))}`;
        newWindow.location.href = impersonateUrl;
      } else {
        newWindow.close();
        const err = await res.json();
        if (window.notifyAdmin) window.notifyAdmin('error', err.error || 'Failed to impersonate');
      }
    } catch (e) {
      newWindow.close();
      console.error(e);
    }
  };

  // ── User Business Profile Edit Handlers ────────────────────────────────────
  const fetchUserProfileAdmin = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/user-profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEditingUser(data.user);
        setEditBusinessName(data.profile?.business_name || '');
        setEditDescription(data.profile?.description || '');
        setEditAddress(data.profile?.address || '');
        setEditSizesInfo(data.profile?.sizes_info || '');
        setEditSystemPrompt(data.aiConfig?.system_prompt || '');
        setEditTemperature(data.aiConfig?.temperature || 0.6);
        setEditTypingDelay(data.aiConfig?.typing_delay || 150);
        setEditDefaultModel(data.aiConfig?.default_model || 'Gemini 1.5 Pro');
      }
    } catch (e) {
      console.error('Failed to fetch user profile details:', e);
    }
  };

  const handleSaveUserProfile = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/user-profile/${editingUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          businessName: editBusinessName,
          description: editDescription,
          address: editAddress,
          sizesInfo: editSizesInfo,
          systemPrompt: editSystemPrompt,
          temperature: editTemperature,
          typingDelay: editTypingDelay,
          defaultModel: editDefaultModel
        })
      });
      if (res.ok) {
        setEditingUser(null);
        if (window.notifyAdmin) window.notifyAdmin('success', 'User business profile updated successfully!');
      }
    } catch (e) {
      console.error('Failed to update user profile:', e);
    }
  };

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

  const handleSaveGoogleConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleClientId,
          googleClientSecret,
          googleRedirectUri,
          googleAuthActive
        })
      });
      if (res.ok) {
        setIsGoogleSaved(true);
        setTimeout(() => setIsGoogleSaved(false), 2000);
        if (window.notify) window.notify('social_success', 'Google OAuth credentials updated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDomainSettings = async (e) => {
    e.preventDefault();
    setIsSavingDomain(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/domain/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(domainConfig)
      });
      const data = await res.json();
      if (res.ok) {
        if (window.notifyAdmin) window.notifyAdmin('success', 'Domain and email settings saved successfully.');
        else alert('Settings saved successfully.');
        fetchDomainStatus();
      } else {
        if (window.notifyAdmin) window.notifyAdmin('error', data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      if (window.notifyAdmin) window.notifyAdmin('error', 'Network error while saving settings.');
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleAutoConfigureDomain = async () => {
    setIsConfiguring(true);
    setLogs([{ level: 'info', msg: 'Starting auto-configuration...' }]);
    setConfigResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/domain/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
      if (res.ok && data.success) {
        setConfigResult('success');
        if (window.notifyAdmin) window.notifyAdmin('success', 'Cloudflare DNS auto-configured and Resend domain verified successfully!');
        fetchDomainStatus();
      } else {
        setConfigResult('error');
        if (data.error) {
          setLogs(prev => [...prev, { level: 'error', msg: data.error }]);
        }
        if (window.notifyAdmin) window.notifyAdmin('error', data.error || 'Failed to auto-configure domain.');
      }
    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, { level: 'error', msg: err.message }]);
      setConfigResult('error');
      if (window.notifyAdmin) window.notifyAdmin('error', 'Network request failed.');
    } finally {
      setIsConfiguring(false);
    }
  };

  const fetchDomainStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/domain/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      const data = await res.json();
      if (res.ok) setDomainStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDomainTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      if (window.notifyAdmin) window.notifyAdmin('error', 'Please enter a valid recipient email address.');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/domain/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ toEmail: testEmailRecipient.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (window.notifyAdmin) window.notifyAdmin('success', `Test email sent successfully to ${testEmailRecipient}!`);
        setTestEmailRecipient('');
      } else {
        if (window.notifyAdmin) window.notifyAdmin('error', data.error || 'Failed to send test email.');
      }
    } catch (err) {
      console.error(err);
      if (window.notifyAdmin) window.notifyAdmin('error', 'Network error sending test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    
    let feats = [];
    let disFeats = [];
    try {
      feats = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
    } catch(e) { feats = []; }
    try {
      disFeats = Array.isArray(plan.disabled_features) ? plan.disabled_features : JSON.parse(plan.disabled_features || '[]');
    } catch(e) { disFeats = []; }

    setEditPlanForm({
      name: plan.name || '',
      price: plan.price || 0,
      responseLimit: plan.response_limit || 500,
      features: feats.join('\n'),
      disabledFeatures: disFeats.join('\n')
    });
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    
    const featuresArr = editPlanForm.features.split('\n').map(f => f.trim()).filter(Boolean);
    const disabledFeaturesArr = editPlanForm.disabledFeatures.split('\n').map(f => f.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/${editingPlan.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editPlanForm.name,
          price: editPlanForm.price,
          responseLimit: editPlanForm.responseLimit,
          features: featuresArr,
          disabledFeatures: disabledFeaturesArr
        })
      });

      if (res.ok) {
        setPlansList(prev => prev.map(p => p.id === editingPlan.id ? { 
          ...p, 
          name: editPlanForm.name,
          price: editPlanForm.price,
          response_limit: editPlanForm.responseLimit,
          features: featuresArr,
          disabled_features: disabledFeaturesArr
        } : p));
        
        setEditingPlan(null);
        if (_toastDispatchAdmin) _toastDispatchAdmin('success', 'Pricing Plan updated successfully!');
      } else {
        const err = await res.json();
        if (_toastDispatchAdmin) _toastDispatchAdmin('error', err.error || 'Failed to update pricing plan.');
      }
    } catch (err) {
      console.error(err);
      if (_toastDispatchAdmin) _toastDispatchAdmin('error', 'Network error while updating pricing plan.');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponPlan || !newCouponDays) {
      if (_toastDispatchAdmin) _toastDispatchAdmin('error', 'Please fill in Coupon Code, Plan, and Trial Days.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newCouponCode,
          planName: newCouponPlan,
          trialDays: newCouponDays,
          expiresAt: newCouponExpires || null,
          maxUses: newCouponMaxUses || null
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setCouponsList(prev => {
          const filtered = prev.filter(c => c.id !== saved.id);
          return [saved, ...filtered];
        });
        setNewCouponCode('');
        setNewCouponPlan('Pro');
        setNewCouponDays(30);
        setNewCouponExpires('');
        setNewCouponMaxUses('');
        if (_toastDispatchAdmin) _toastDispatchAdmin('success', 'Coupon created/updated successfully!');
      } else {
        const err = await res.json();
        if (_toastDispatchAdmin) _toastDispatchAdmin('error', err.error || 'Failed to create coupon.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coupons/${couponId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCouponsList(prev => prev.filter(c => c.id !== couponId));
        if (_toastDispatchAdmin) _toastDispatchAdmin('success', 'Coupon deleted successfully.');
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

  const handleDeleteUserCard = async (cardId) => {
    if (!confirm('Are you sure you want to remove this user credit card method?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/payments/methods/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        setAllSavedCards(prev => prev.filter(c => c.id !== cardId));
        if (window.notify) window.notify('success', 'User card successfully removed.');
        else alert('User card successfully removed.');
      } else {
        const errData = await res.json();
        if (window.notify) window.notify('error', errData.error || 'Failed to remove card.');
        else alert(errData.error || 'Failed to remove card.');
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
    document.title = 'AgentBunny - System Admin Portal';
  }, []);

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCards = allSavedCards.filter(c => 
    c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.card_last4?.includes(searchQuery)
  );

  const filteredTransactions = transactionsList.filter(tx => 
    tx.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tx.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.stripe_session_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-[#111111] font-sans antialiased overflow-hidden">
      
      {/* ── Left Sidebar ── */}
      <div className="w-64 bg-white border-r border-gray-150 flex flex-col justify-between p-6 overflow-y-auto h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <span className="w-3.5 h-3.5 rounded-full bg-[#00832e]"></span>
            <span className="text-neutral-800 font-extrabold tracking-tight text-lg uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              AgentBunny <span className="text-[#00832e]">Admin</span>
            </span>
          </div>

          {/* Sidebar Tabs */}
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'overview' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'overview' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'users' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'users' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>User Accounts</span>
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'sessions' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'sessions' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Smartphone className="w-4 h-4 flex-shrink-0" />
              <span>WhatsApp Sessions</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai-config')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'ai-config' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'ai-config' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>System Settings</span>
            </button>
            <button 
              onClick={() => setActiveTab('domain-config')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'domain-config' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'domain-config' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span>Domain & Email</span>
            </button>
            <button 
              onClick={() => setActiveTab('coupons')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'coupons' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'coupons' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Gift className="w-4 h-4 flex-shrink-0" />
              <span>Coupon Codes</span>
            </button>

            <button 
              onClick={() => setActiveTab('transactions')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'transactions' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'transactions' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span>Billing & Payments</span>
            </button>
            <button 
              onClick={() => setActiveTab('user-cards')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'user-cards' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'user-cards' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span>Saved Cards Manager</span>
            </button>
            <button 
              onClick={() => setActiveTab('suspicious')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'suspicious' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'suspicious' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Suspicious Activities</span>
            </button>
            <button 
              onClick={() => setActiveTab('audit-logs')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'audit-logs' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'audit-logs' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>System Audit Logs</span>
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'tickets' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'tickets' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span>Support Tickets</span>
            </button>
            <button 
              onClick={() => setActiveTab('email-templates')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'email-templates' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'email-templates' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>Email Templates</span>
            </button>
            <button 
              onClick={() => setActiveTab('plans')}
              className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all ${activeTab === 'plans' ? 'bg-[#00832e]/5 text-[#00832e]' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            >
              {activeTab === 'plans' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#00832e] rounded-r-full"></span>}
              <Sliders className="w-4 h-4 flex-shrink-0" />
              <span>Pricing Plans</span>
            </button>
          </nav>
        </div>

        {/* Admin User Info & LogOut */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f4ea] border border-[#00832e]/10 flex items-center justify-center font-extrabold text-[#00832e] text-sm uppercase">
              SA
            </div>
            <div>
              <p className="text-neutral-800 text-xs font-extrabold uppercase tracking-wider">{admin?.name || 'SYSTEM ADMIN'}</p>
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest">{admin?.role || 'ADMIN'}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100/30"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Total Active Users</span>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-[#00832e]"><Users className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{metrics.totalUsers}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Active portal users</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Linked WhatsApps</span>
                    <div className="p-3 rounded-2xl bg-[#00832e]/10 text-[#00832e]"><Smartphone className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{metrics.totalSessions}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">WhatsApp configurations</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">AI Responder Calls</span>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Cpu className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{metrics.activeSessions}</h2>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-2">Active linked sockets</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Process Memory</span>
                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600"><Database className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{metrics.memoryUsage}</h2>
                  <p className="text-[10px] text-purple-600 font-bold uppercase mt-2">Heap: {metrics.uptime}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Monthly MRR</span>
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><CreditCard className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {(metrics.mrr || 0).toLocaleString()}</h2>
                  <p className="text-[10px] text-amber-600 font-bold uppercase mt-2">Monthly Recurring Revenue</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">ARPU Stats</span>
                    <div className="p-3 rounded-2xl bg-teal-50 text-teal-600"><Shield className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {Math.round(metrics.arpu || 0).toLocaleString()}</h2>
                  <p className="text-[10px] text-teal-600 font-bold uppercase mt-2">Average User Yield</p>
                </div>
              </div>

              {/* Earnings Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Weekly Revenue</span>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-[#00832e]"><CreditCard className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {(metrics.weeklyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Past 7 days earnings</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Monthly Revenue</span>
                    <div className="p-3 rounded-2xl bg-[#00832e]/10 text-[#00832e]"><CreditCard className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {(metrics.monthlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                  <p className="text-[10px] text-[#00832e] font-bold uppercase mt-2">Past 30 days earnings</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Yearly Revenue</span>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><CreditCard className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {(metrics.yearlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-2">Past 365 days earnings</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Total Earnings</span>
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><CreditCard className="w-5 h-5" /></div>
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">රු {(metrics.allTimeRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                  <p className="text-[10px] text-amber-600 font-bold uppercase mt-2">All time completed sales</p>
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

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#00832e]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Tier Distribution</h3>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                          <span>Free Starter</span>
                          <span>{metrics.distribution?.Free || 0} users</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-gray-400 h-full rounded-full" style={{ width: `${metrics.totalUsers > 0 ? ((metrics.distribution?.Free || 0) / metrics.totalUsers) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-emerald-600 mb-1">
                          <span>Premium Growth</span>
                          <span>{metrics.distribution?.Premium || 0} users</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.totalUsers > 0 ? ((metrics.distribution?.Premium || 0) / metrics.totalUsers) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-purple-600 mb-1">
                          <span>Enterprise Elite</span>
                          <span>{metrics.distribution?.Enterprise || 0} users</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: `${metrics.totalUsers > 0 ? ((metrics.distribution?.Enterprise || 0) / metrics.totalUsers) * 100 : 0}%` }}></div>
                        </div>
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

              {/* SaaS Controls & Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Maintenance Mode Panel */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">System Maintenance Panel</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-light mb-4">
                      Activating Maintenance Mode blocks non-admin storefront access and merchant dashboard tools instantly, showing a "Maintenance Mode" screen.
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <span className="text-xs font-bold text-amber-800">
                      {maintenanceActive ? '⚠️ Mode is ACTIVE' : 'Mode is INACTIVE'}
                    </span>
                    <button
                      onClick={() => handleToggleMaintenance(!maintenanceActive)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                        maintenanceActive 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {maintenanceActive ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                </div>

                {/* AI Token / Message Usage Panel */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#00832e]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">AI Message Usage Analytics</h3>
                    </div>
                    <span className="text-[10px] bg-[#00832e]/10 text-[#00832e] px-2 py-0.5 rounded font-extrabold">Active Logs</span>
                  </div>
                  <div className="overflow-x-auto max-h-[220px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-neutral-400 font-bold uppercase tracking-widest">
                          <th className="py-2.5">User</th>
                          <th className="py-2.5">Email</th>
                          <th className="py-2.5 text-right">AI Responses</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {aiUsageStats.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="py-6 text-center text-gray-400 font-light">No AI logs recorded.</td>
                          </tr>
                        ) : (
                          aiUsageStats.map((stat, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50/50 transition-colors font-medium">
                              <td className="py-3 font-bold text-neutral-800">{stat.user_name}</td>
                              <td className="py-3 text-neutral-500">{stat.user_email}</td>
                              <td className="py-3 text-right font-mono font-bold text-[#00832e]">{stat.ai_messages_count} messages</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
                        <td className="py-4 text-right space-x-2">
                          <button 
                            onClick={() => handleImpersonateUser(u.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all"
                          >
                            Impersonate
                          </button>
                          <button 
                            onClick={() => fetchUserProfileAdmin(u.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            Edit Profile
                          </button>
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
                        <td className="py-4">
                          {renamingSessionId === s.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={renameVal} 
                                onChange={(e) => setRenameVal(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-neutral-800" 
                                style={{ width: '150px' }}
                              />
                              <button onClick={() => renameSessionAdmin(s.id)} className="bg-[#00832e] text-white rounded-lg px-2 py-1 text-xs border-none cursor-pointer"><i className="fa-solid fa-check"></i></button>
                              <button onClick={() => setRenamingSessionId(null)} className="bg-gray-400 text-white rounded-lg px-2 py-1 text-xs border-none cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-800">{s.session_name || 'WhatsApp Account'}</span>
                              <button 
                                onClick={() => { setRenamingSessionId(s.id); setRenameVal(s.session_name || 'WhatsApp Account'); }} 
                                className="text-gray-400 hover:text-gray-600 p-0 border-none bg-transparent cursor-pointer"
                              >
                                <i className="fa-solid fa-pen text-[10px]"></i>
                              </button>
                            </div>
                          )}
                          <div className="font-mono text-[10px] text-neutral-400 mt-0.5">{s.id}</div>
                        </td>
                        <td className="py-4 font-bold text-neutral-800">{s.userId}</td>
                        <td className="py-4 font-mono text-neutral-800">{s.phone || '—'}</td>
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
                    <textarea 
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Enter Gemini API Keys (one per line for automatic rotation & failover)..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:border-[#00832e] focus:outline-none"
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

                {/* Google OAuth Configuration Settings */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-neutral-800">
                    <Shield className="w-5 h-5 text-[#00832e]" />
                    <h4 className="text-sm font-black uppercase tracking-wider">Google Login Configuration</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    Configure Google OAuth Client credentials for social login & signup on the authentication page.
                  </p>
                  
                  <form onSubmit={handleSaveGoogleConfig} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Google Client ID</label>
                      <input 
                        type="text"
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        placeholder="Google Client ID..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Google Client Secret</label>
                      <input 
                        type="password"
                        value={googleClientSecret}
                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                        placeholder="Google Client Secret..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Redirect URI</label>
                      <input 
                        type="text"
                        value={googleRedirectUri}
                        onChange={(e) => setGoogleRedirectUri(e.target.value)}
                        placeholder="Redirect URI (e.g. http://localhost:5000/api/auth/google/callback)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-[#00832e] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox"
                        checked={googleAuthActive}
                        onChange={(e) => setGoogleAuthActive(e.target.checked)}
                        className="w-4 h-4 accent-black rounded border-gray-200 focus:ring-0"
                        id="google-auth-active"
                      />
                      <label htmlFor="google-auth-active" className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 cursor-pointer">Activate Google Auth</label>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-black text-white hover:bg-neutral-800 transition-all py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 mt-2"
                    >
                      {isGoogleSaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                      {isGoogleSaved ? 'Saved Settings!' : 'Save Credentials'}
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
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Billing History Logs</h3>
                {/* Search Bar */}
                <div className="flex items-center gap-3 bg-[#f4f6f8] px-4 py-2 rounded-2xl w-full max-w-xs">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..." 
                    className="bg-transparent w-full text-xs border-none outline-none focus:ring-0 placeholder-gray-400"
                  />
                </div>
              </div>
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
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 font-light">No billing records found.</td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
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

          {/* 7. SAVED CARDS MANAGER VIEW */}
          {activeTab === 'user-cards' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Saved Payment Methods across Users</h3>
                {/* Search Bar */}
                <div className="flex items-center gap-3 bg-[#f4f6f8] px-4 py-2 rounded-2xl w-full max-w-xs">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cards..." 
                    className="bg-transparent w-full text-xs border-none outline-none focus:ring-0 placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      <th className="py-4">User</th>
                      <th className="py-4">Email</th>
                      <th className="py-4">Card Brand</th>
                      <th className="py-4">Last 4 Digits</th>
                      <th className="py-4">Fingerprint</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Registered Date</th>
                      <th className="py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCards.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 font-light">No saved payment methods found in the system.</td>
                      </tr>
                    ) : (
                      filteredCards.map(c => (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                          <td className="py-4 font-bold text-neutral-800">{c.user_name || 'N/A'} (ID: {c.user_id})</td>
                          <td className="py-4 text-neutral-500">{c.user_email || 'N/A'}</td>
                          <td className="py-4 font-bold text-neutral-800">{c.card_brand}</td>
                          <td className="py-4 font-mono text-neutral-800">•••• {c.card_last4}</td>
                          <td className="py-4 font-mono text-xs text-neutral-400">{c.card_fingerprint}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.is_default ? 'bg-emerald-50 text-[#00832e]' : 'bg-gray-100 text-gray-500'}`}>
                              {c.is_default ? 'Primary' : 'Backup'}
                            </span>
                          </td>
                          <td className="py-4 text-neutral-500">
                            {new Date(c.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDeleteUserCard(c.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-all uppercase tracking-wider"
                            >
                              Remove Card
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. SUSPICIOUS ACTIVITIES VIEW */}
          {activeTab === 'suspicious' && (
            <div className="space-y-8">
              {/* Alert headers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 flex items-start gap-4 text-red-900">
                  <AlertTriangle className="w-10 h-10 text-red-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider">Duplicate WhatsApp Connections</h4>
                    <p className="text-xs text-red-700 font-light leading-relaxed mt-1">
                      Flagged active WhatsApp numbers connected across more than one account simultaneously. Suspected trial farming or multi-tenant reuse.
                    </p>
                    <span className="inline-block mt-3 text-xs bg-red-100 text-red-700 font-black px-2.5 py-1 rounded-full">
                      {suspiciousActivities.duplicateWhatsapps.length} Violations
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 text-amber-900">
                  <AlertTriangle className="w-10 h-10 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider">Duplicate Card Fingerprints</h4>
                    <p className="text-xs text-amber-700 font-light leading-relaxed mt-1">
                      Flagged cards with identical Stripe fingerprints saved under different user accounts. Indicates card sharing or duplicate accounts.
                    </p>
                    <span className="inline-block mt-3 text-xs bg-amber-100 text-amber-700 font-black px-2.5 py-1 rounded-full">
                      {suspiciousActivities.duplicateCards.length} Cards Shared
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate WhatsApps details table */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">Duplicate WhatsApp Connections List</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                        <th className="py-4">Phone Number</th>
                        <th className="py-4">Session Name</th>
                        <th className="py-4">Library</th>
                        <th className="py-4">Registered User</th>
                        <th className="py-4">User Email</th>
                        <th className="py-4">Linked Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivities.duplicateWhatsapps.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-gray-400 font-light">No duplicate WhatsApp connections flagged. System is clean.</td>
                        </tr>
                      ) : (
                        suspiciousActivities.duplicateWhatsapps.map((ws, index) => (
                          <tr key={ws.session_id + '_' + index} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                            <td className="py-4 font-mono font-bold text-red-600 bg-red-50/20 px-2 rounded-lg">{ws.phone}</td>
                            <td className="py-4 font-bold text-neutral-800">{ws.session_name}</td>
                            <td className="py-4 text-neutral-500">{ws.library}</td>
                            <td className="py-4 font-bold text-neutral-800">{ws.user_name} (ID: {ws.user_id})</td>
                            <td className="py-4 text-neutral-500">{ws.user_email}</td>
                            <td className="py-4 text-neutral-500">{new Date(ws.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Cards details table */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">Duplicate Card Fingerprints List</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                        <th className="py-4">Card Fingerprint</th>
                        <th className="py-4">Card Brand</th>
                        <th className="py-4">Last 4</th>
                        <th className="py-4">Registered User</th>
                        <th className="py-4">User Email</th>
                        <th className="py-4">Status</th>
                        <th className="py-4">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivities.duplicateCards.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-gray-400 font-light">No card fingerprints shared across different users.</td>
                        </tr>
                      ) : (
                        suspiciousActivities.duplicateCards.map((c, index) => (
                          <tr key={c.method_id + '_' + index} className="border-b border-gray-50 hover:bg-neutral-50/50 transition-all font-medium text-neutral-700">
                            <td className="py-4 font-mono text-xs text-amber-600 bg-amber-50/20 px-2 rounded-lg">{c.card_fingerprint}</td>
                            <td className="py-4 font-bold text-neutral-800">{c.card_brand}</td>
                            <td className="py-4 font-mono text-neutral-800">•••• {c.card_last4}</td>
                            <td className="py-4 font-bold text-neutral-800">{c.user_name} (ID: {c.user_id})</td>
                            <td className="py-4 text-neutral-500">{c.user_email}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.is_default ? 'bg-emerald-50 text-[#00832e]' : 'bg-gray-100 text-gray-500'}`}>
                                {c.is_default ? 'Primary' : 'Backup'}
                              </span>
                            </td>
                            <td className="py-4 text-neutral-500">{new Date(c.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. SUPPORT TICKETS VIEW */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-160px)]">
              {/* Left Column: Tickets List */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-xs p-5 flex flex-col h-full overflow-hidden">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 mb-4 flex items-center justify-between">
                  <span>Support Tickets</span>
                  <span className="bg-[#00832e]/10 text-[#00832e] text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {ticketsList.length} Total
                  </span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {ticketsList.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 font-light text-xs">
                      No support tickets found in the system.
                    </div>
                  ) : (
                    ticketsList.map(t => {
                      const isSelected = selectedAdminTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => fetchTicketDetailsAdmin(t.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#00832e]/5 border-[#00832e]/30 shadow-xs' 
                              : 'bg-neutral-50/40 border-gray-100 hover:bg-neutral-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-400">#TKT-{t.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              t.status === 'Open' 
                                ? 'bg-emerald-50 text-[#00832e] border border-emerald-100/50' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-neutral-800 text-xs mt-2 line-clamp-1">{t.subject}</h4>
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                          <div className="flex items-center justify-between mt-3 text-[10px] text-gray-400 font-medium">
                            <span>User ID: {t.user_id}</span>
                            <span>{new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Ticket Conversation details */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-xs flex flex-col h-full overflow-hidden">
                {!selectedAdminTicket ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-[#00832e]/5 rounded-full flex items-center justify-center text-[#00832e] mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">No Ticket Selected</h3>
                    <p className="text-xs text-gray-400 font-light mt-1 max-w-sm leading-relaxed">
                      Select a ticket from the left panel list to view description, user details, and response history.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-neutral-50/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-gray-400">#TKT-{selectedAdminTicket.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            selectedAdminTicket.status === 'Open' 
                              ? 'bg-emerald-50 text-[#00832e] border border-emerald-100/50' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {selectedAdminTicket.status}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-neutral-800 text-sm mt-1 truncate">{selectedAdminTicket.subject}</h3>
                      </div>
                      
                      {selectedAdminTicket.status === 'Open' && (
                        <button
                          onClick={() => handleCloseTicket(selectedAdminTicket.id)}
                          className="px-3.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-gray-200 text-neutral-600 rounded-xl font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Mark as Closed
                        </button>
                      )}
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/30">
                      {/* Ticket Original Description */}
                      <div className="flex flex-col items-start max-w-[85%]">
                        <div className="bg-white border border-gray-100/80 p-4 rounded-2xl shadow-2xs">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">User Ticket Description</span>
                          <p className="text-xs text-neutral-700 font-medium leading-relaxed mt-1.5 whitespace-pre-wrap">
                            {selectedAdminTicket.description}
                          </p>
                          <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-gray-50 text-[9px] text-gray-400">
                            <span>Creator ID: {selectedAdminTicket.user_id}</span>
                            <span>{new Date(selectedAdminTicket.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Replies List */}
                      {adminTicketReplies.map(r => {
                        const isAdmin = r.sender_role === 'admin' || r.sender_role === 'agent';
                        return (
                          <div
                            key={r.id}
                            className={`flex flex-col max-w-[85%] ${isAdmin ? 'ml-auto items-end' : 'items-start'}`}
                          >
                            <div className={`p-4 rounded-2xl shadow-2xs ${
                              isAdmin 
                                ? 'bg-[#00832e] text-white' 
                                : 'bg-white border border-gray-100/80 text-neutral-700'
                            }`}>
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                isAdmin ? 'text-emerald-100' : 'text-gray-400'
                              }`}>
                                {isAdmin ? 'System Admin Response' : 'Merchant User'}
                              </span>
                              <p className="text-xs font-medium leading-relaxed mt-1.5 whitespace-pre-wrap">
                                {r.message}
                              </p>
                              <span className={`block text-[9px] mt-2.5 text-right ${
                                isAdmin ? 'text-emerald-200/80' : 'text-gray-400'
                              }`}>
                                {new Date(r.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer / Reply Box */}
                    {selectedAdminTicket.status === 'Open' ? (
                      <form onSubmit={handleSendAdminReply} className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-3 items-end">
                          <textarea
                            placeholder="Type support response message here..."
                            rows="2"
                            value={adminReplyMsg}
                            onChange={(e) => setAdminReplyMsg(e.target.value)}
                            required
                            className="flex-1 px-4 py-3 text-xs outline-none bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black/5 border border-gray-200 rounded-2xl resize-none"
                          />
                          <button
                            type="submit"
                            className="btn btn--primary px-4 py-3 flex items-center justify-center gap-2 border-none active:scale-[0.98] rounded-2xl font-bold text-xs cursor-pointer h-[46px]"
                          >
                            Send Reply
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400 font-medium">
                        This support ticket is closed. Re-opening is disabled.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. EMAIL TEMPLATES VIEW */}
          {activeTab === 'email-templates' && (
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-160px)]">
              {/* Left Panel: Templates List */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-xs p-5 flex flex-col h-full overflow-hidden">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 mb-4">
                  Email Templates
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {emailTemplates.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 font-light text-xs">
                      No templates loaded.
                    </div>
                  ) : (
                    emailTemplates.map(t => {
                      const isSelected = selectedTemplate?.key === t.key;
                      return (
                        <div
                          key={t.key}
                          onClick={() => {
                            setSelectedTemplate(t);
                            setTemplateForm({ subject: t.subject, body: t.body });
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#00832e]/5 border-[#00832e]/30 shadow-xs' 
                              : 'bg-neutral-50/40 border-gray-100 hover:bg-neutral-50 hover:border-gray-200'
                          }`}
                        >
                          <h4 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider">
                            {t.key.replace('_', ' ')}
                          </h4>
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{t.subject}</p>
                          <div className="text-[9px] text-gray-400 mt-2 font-medium">
                            Updated: {new Date(t.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Editor Form */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-xs flex flex-col h-full overflow-hidden">
                {!selectedTemplate ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-[#00832e]/5 rounded-full flex items-center justify-center text-[#00832e] mb-4">
                      <Mail className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">Select a Template</h3>
                    <p className="text-xs text-gray-400 font-light mt-1 max-w-sm leading-relaxed">
                      Select an email template from the list on the left to edit its subject line, variables, and body content.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateTemplate} className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 bg-neutral-50/30 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-gray-400">TEMPLATE KEY</span>
                        <h3 className="font-extrabold text-neutral-800 text-sm uppercase tracking-wider mt-0.5">
                          {selectedTemplate.key.replace('_', ' ')}
                        </h3>
                      </div>
                      <button
                        type="submit"
                        className="btn btn--primary px-4 py-2 border-none active:scale-[0.98] rounded-xl font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        Save Template
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Subject</label>
                        <input
                          type="text"
                          required
                          value={templateForm.subject}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                          className="w-full px-4 py-3 text-xs outline-none bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black/5 border border-gray-200 rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Body</label>
                        <textarea
                          required
                          rows="10"
                          value={templateForm.body}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                          className="w-full px-4 py-3 text-xs outline-none bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-black/5 border border-gray-200 rounded-xl resize-none font-mono leading-relaxed"
                        />
                      </div>

                      {/* Helper Merge Tags */}
                      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Available Merge Variables</h4>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-light">
                          Use double curly braces to inject user specific properties. For example:
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1 font-mono text-[9px]">
                          <span className="bg-white border border-amber-200 px-2 py-1 rounded text-amber-700 font-bold">{"{{fullName}}"}</span>
                          <span className="bg-white border border-amber-200 px-2 py-1 rounded text-amber-700 font-bold">{"{{plan}}"}</span>
                          <span className="bg-white border border-amber-200 px-2 py-1 rounded text-amber-700 font-bold">{"{{resetLink}}"}</span>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 11. COUPON CODES MANAGER VIEW */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Create Coupon Form */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#00832e]" /> Generate Coupon Code
                  </h3>
                  <p className="text-[11px] text-gray-500 font-light mt-1.5 leading-relaxed">
                    Create a custom coupon code that users can claim on their dashboard to activate a trial or subscription plan.
                  </p>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Coupon Code</label>
                    <input 
                      type="text"
                      required
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. TRIAL30, BUNDLE90"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Subscription Plan Granted</label>
                    <select 
                      value={newCouponPlan}
                      onChange={(e) => setNewCouponPlan(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                    >
                      <option value="Pro">Pro Plan</option>
                      <option value="Elite">Elite Plan</option>
                      <option value="Enterprise">Enterprise Plan</option>
                      <option value="Free">Free Plan</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Trial / Subscription Duration (Days)</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      value={newCouponDays}
                      onChange={(e) => setNewCouponDays(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Expiration Date (Optional)</label>
                    <input 
                      type="date"
                      value={newCouponExpires}
                      onChange={(e) => setNewCouponExpires(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Maximum Claims Limit (Optional)</label>
                    <input 
                      type="number"
                      min="1"
                      value={newCouponMaxUses}
                      onChange={(e) => setNewCouponMaxUses(e.target.value)}
                      placeholder="Unlimited if empty..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-black text-white hover:bg-neutral-800 transition-all py-3 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 mt-4"
                  >
                    <Save className="w-4 h-4" /> Create Coupon
                  </button>
                </form>
              </div>

              {/* Right Column: Active Coupons List */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-160px)] overflow-hidden">
                <div className="mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">
                    Active Coupon Codes
                  </h3>
                  <p className="text-[11px] text-gray-500 font-light mt-1">
                    A list of all generated coupons, their claims counts, expiration statuses, and options to delete.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {couponsList.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-light text-xs">
                      No active coupons found. Use the form to generate one.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            <th className="py-3 px-4">Code</th>
                            <th className="py-3 px-4">Plan</th>
                            <th className="py-3 px-4">Duration</th>
                            <th className="py-3 px-4">Claims</th>
                            <th className="py-3 px-4">Expiry Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {couponsList.map(c => {
                            const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                            const isFull = c.max_uses !== null && c.uses_count >= c.max_uses;
                            return (
                              <tr key={c.id} className="border-b border-gray-50 text-xs text-neutral-600 hover:bg-neutral-50/50">
                                <td className="py-3 px-4 font-black text-neutral-800">{c.code}</td>
                                <td className="py-3 px-4">
                                  <span className="bg-[#00832e]/10 text-[#00832e] font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                                    {c.plan_name}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold">{c.trial_days} Days</td>
                                <td className="py-3 px-4">
                                  <span className={isFull ? 'text-red-500 font-bold' : 'font-medium'}>
                                    {c.uses_count} / {c.max_uses ?? '∞'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {c.expires_at ? (
                                    <span className={isExpired ? 'text-red-400 line-through font-light' : 'font-medium'}>
                                      {new Date(c.expires_at).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-light">No Expiry</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button 
                                    onClick={() => handleDeleteCoupon(c.id)}
                                    className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors bg-neutral-50 hover:bg-red-50 rounded-lg inline-flex"
                                    title="Delete Coupon"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
            </div>
          )}

          {/* 12. PRICING PLANS CONFIGURATION VIEW */}
          {activeTab === 'plans' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">
                    System Pricing Packages & AI Limits
                  </h3>
                  <p className="text-[11px] text-gray-500 font-light mt-1">
                    Manage the names, LKR subscription prices, monthly AI response limits, and features list for your packages.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      <th className="py-3 px-4">Plan Key ID</th>
                      <th className="py-3 px-4">Display Name</th>
                      <th className="py-3 px-4">Price (LKR)</th>
                      <th className="py-3 px-4">AI Response Limit</th>
                      <th className="py-3 px-4">Enabled Features</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plansList.map(p => {
                      let featsCount = 0;
                      try {
                        featsCount = (Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]')).length;
                      } catch(e) {}

                      return (
                        <tr key={p.id} className="border-b border-gray-50 text-xs text-neutral-600 hover:bg-neutral-50/50">
                          <td className="py-4 px-4 font-black text-neutral-800 font-mono">{p.id}</td>
                          <td className="py-4 px-4 font-bold text-neutral-700">{p.name}</td>
                          <td className="py-4 px-4 font-mono font-bold text-neutral-800">
                            {p.id === 'Enterprise' ? 'Custom' : `රු ${Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            <span className="bg-blue-50 text-blue-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                              {p.response_limit === 999999 ? 'Unlimited' : `${Number(p.response_limit).toLocaleString()} Msg`}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-neutral-500 font-light">{featsCount} Features listed</td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => handleEditPlan(p)}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-[#00832e]/10 text-neutral-700 hover:text-[#00832e] font-bold text-[10px] rounded-lg transition-colors border-none cursor-pointer uppercase tracking-wider"
                            >
                              Edit Package
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 13. DOMAIN & EMAIL CONFIGURATION VIEW */}
          {activeTab === 'domain-config' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-[#00832e]" /> Domain & Cloudflare Configuration
                    </h3>
                    <p className="text-[11px] text-gray-500 font-light mt-1.5 leading-relaxed">
                      Configure your custom domain settings. Cloudflare API Token requires "Edit DNS" permissions.
                    </p>
                  </div>

                  <form onSubmit={handleSaveDomainSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Custom Domain Name</label>
                        <input 
                          type="text"
                          required
                          value={domainConfig.domainName}
                          onChange={(e) => setDomainConfig(prev => ({ ...prev, domainName: e.target.value }))}
                          placeholder="e.g. agentbunny.com"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors"
                        />
                        <p className="text-[9px] text-neutral-400">Without https:// or www. (e.g. agentbunny.com)</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cloudflare Zone ID</label>
                        <input 
                          type="text"
                          required
                          value={domainConfig.cloudflareZoneId}
                          onChange={(e) => setDomainConfig(prev => ({ ...prev, cloudflareZoneId: e.target.value }))}
                          placeholder="Cloudflare Zone ID"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cloudflare API Token</label>
                      <input 
                        type="password"
                        required
                        value={domainConfig.cloudflareApiToken}
                        onChange={(e) => setDomainConfig(prev => ({ ...prev, cloudflareApiToken: e.target.value }))}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors font-mono"
                      />
                      <p className="text-[9px] text-neutral-400">
                        Create token at <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-[#00832e] hover:underline font-bold">Cloudflare API Tokens</a> with Zone.DNS "Edit" permission.
                      </p>
                    </div>

                    <div className="space-y-1 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">Resend API Config</h4>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Resend API Key</label>
                      <input 
                        type="password"
                        required
                        value={domainConfig.resendApiKey}
                        onChange={(e) => setDomainConfig(prev => ({ ...prev, resendApiKey: e.target.value }))}
                        placeholder="re_••••••••••••••••"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors font-mono"
                      />
                      <p className="text-[9px] text-neutral-400">
                        Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#00832e] hover:underline font-bold">Resend Keys</a>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Sender Display Name</label>
                        <input 
                          type="text"
                          required
                          value={domainConfig.emailSenderName}
                          onChange={(e) => setDomainConfig(prev => ({ ...prev, emailSenderName: e.target.value }))}
                          placeholder="e.g. AgentBunny"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Sender Email Address</label>
                        <input 
                          type="text"
                          required
                          value={domainConfig.emailSender}
                          onChange={(e) => setDomainConfig(prev => ({ ...prev, emailSender: e.target.value }))}
                          placeholder="e.g. noreply@agentbunny.com"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 font-sans">
                      <button
                        type="submit"
                        disabled={isSavingDomain}
                        className="flex-1 px-4 py-3 bg-[#00832e] hover:bg-[#007027] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingDomain ? 'Saving...' : 'Save Settings'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleAutoConfigureDomain}
                        disabled={isConfiguring || !domainConfig.domainName || !domainConfig.cloudflareZoneId || !domainConfig.cloudflareApiToken || !domainConfig.resendApiKey}
                        className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isConfiguring ? 'Configuring DNS...' : '🚀 Auto Configure Domain'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Domain Verification Status block */}
                {domainStatus && domainStatus.status !== 'not_configured' && (
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">Resend Domain Verification Details</h4>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${
                        domainStatus.status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                        domainStatus.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {domainStatus.status}
                      </span>
                    </div>

                    {domainStatus.records && domainStatus.records.length > 0 && (
                      <div className="space-y-3">
                        {domainStatus.records.map((rec, i) => (
                          <div key={i} className="flex justify-between items-start gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-200 text-neutral-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase">{rec.type}</span>
                                <span className="font-mono font-bold text-neutral-800 truncate">{rec.name}</span>
                              </div>
                              <div className="font-mono text-[10px] text-neutral-500 break-all">{rec.value}</div>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rec.value);
                                if (window.notifyAdmin) window.notifyAdmin('success', 'Value copied to clipboard!');
                              }}
                              className="px-2 py-1 bg-white hover:bg-neutral-100 text-[10px] font-bold rounded border border-neutral-200 cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Console Output & Send Test Email */}
              <div className="space-y-6">
                {/* Send Test Email Card */}
                {domainConfig.domainName && (
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">Send Config Verification Email</h4>
                      <p className="text-[10px] text-gray-500">Send a verification template test mail to ensure deliverability is working.</p>
                    </div>

                    <div className="space-y-2">
                      <input 
                        type="email"
                        value={testEmailRecipient}
                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                        placeholder="receiver@gmail.com"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:border-black focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSendDomainTestEmail}
                        disabled={isSendingTest || !testEmailRecipient}
                        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSendingTest ? 'Sending Test...' : 'Send Verification Email'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Console Log Panel */}
                <div className="bg-[#0b0c10] text-[#4af626] font-mono text-[11px] rounded-3xl p-5 shadow-inner border border-neutral-800 min-h-[300px] flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800 mb-3 text-neutral-500 uppercase tracking-widest text-[9px] font-bold">
                    <span>DNS Configuration Console</span>
                    {configResult === 'success' && <span className="text-emerald-400">Success</span>}
                    {configResult === 'error' && <span className="text-red-400">Failed</span>}
                    {isConfiguring && <span className="text-blue-400 animate-pulse">Running...</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 max-h-[350px]">
                    {logs.length === 0 ? (
                      <span className="text-neutral-500">$ idle. Enter settings and click Auto Configure.</span>
                    ) : (
                      logs.map((e, idx) => (
                        <div key={idx} className={
                          e.level === 'error' ? 'text-red-400' :
                          e.level === 'ok' ? 'text-emerald-400' :
                          e.level === 'warn' ? 'text-amber-400' : 'text-neutral-200'
                        }>
                          [{e.level.toUpperCase()}] {e.msg}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}



        </main>
      </div>
      {/* Edit User Profile Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-neutral-800 text-base uppercase tracking-wider">Edit User Profile & AI config</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">Email: {editingUser.email}</p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-50 border-none cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveUserProfile} className="space-y-6">
              {/* Profile Details section */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#00832e]">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Name</label>
                    <input 
                      type="text"
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Store Address</label>
                    <input 
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Description / FAQ</label>
                  <textarea 
                    rows="3"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Sizes & Inventory Info (S, M, L etc.)</label>
                  <input 
                    type="text"
                    value={editSizesInfo}
                    onChange={(e) => setEditSizesInfo(e.target.value)}
                    placeholder="e.g. S, M, L, XL, XXL available. Free delivery on orders above Rs. 5000"
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* AI Config section */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#00832e]">AI Assistant Configurations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Model</label>
                    <select
                      value={editDefaultModel}
                      onChange={(e) => setEditDefaultModel(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white border border-gray-200 rounded-xl outline-none font-bold"
                    >
                      <option value="Gemini 1.5 Flash">Gemini 1.5 Flash (Fast)</option>
                      <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Smart)</option>
                      <option value="Gemini 2.0 Flash">Gemini 2.0 Flash (Next-Gen)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Temperature ({editTemperature})</label>
                    <input 
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[#00832e] mt-2.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Typing Delay (ms)</label>
                    <input 
                      type="number"
                      value={editTypingDelay}
                      onChange={(e) => setEditTypingDelay(parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI System Persona / Prompt</label>
                  <textarea 
                    rows="4"
                    value={editSystemPrompt}
                    onChange={(e) => setEditSystemPrompt(e.target.value)}
                    placeholder="Instructions for how the AI agent responds to customers..."
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-[#00832e]/5 border border-gray-200 rounded-xl outline-none resize-none font-sans"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-neutral-50 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#00832e] hover:bg-[#00832e]/90 text-white rounded-xl font-bold text-xs border-none cursor-pointer active:scale-[0.98] transition-all"
                >
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pricing Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-neutral-800 text-base uppercase tracking-wider">Edit Pricing Plan: {editingPlan.id}</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">Configuration updates are pushed live immediately.</p>
              </div>
              <button 
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-50 border-none cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Display Name</label>
                <input 
                  type="text" 
                  required
                  value={editPlanForm.name}
                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Price (LKR)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={editPlanForm.price}
                    onChange={(e) => setEditPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">AI Response Limit</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={editPlanForm.responseLimit}
                    onChange={(e) => setEditPlanForm(prev => ({ ...prev, responseLimit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Enabled Features list</label>
                  <span className="text-[9px] text-gray-400">One feature per line</span>
                </div>
                <textarea 
                  rows="5"
                  value={editPlanForm.features}
                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="e.g. 1 WhatsApp Number&#10;500 AI Responses/mo"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Disabled Features list</label>
                  <span className="text-[9px] text-gray-400">One feature per line</span>
                </div>
                <textarea 
                  rows="3"
                  value={editPlanForm.disabledFeatures}
                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, disabledFeatures: e.target.value }))}
                  placeholder="e.g. ✗ Broadcast Campaigns"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:border-[#00832e] focus:outline-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all py-3 rounded-xl text-xs font-bold uppercase tracking-widest border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-black text-white hover:bg-neutral-800 transition-all py-3 rounded-xl text-xs font-bold uppercase tracking-widest border-none cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

export default AdminDashboard;

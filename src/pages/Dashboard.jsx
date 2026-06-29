import React, { useState, useEffect, useRef, useCallback } from 'react';
import dashboardPages from '../data/dashboardPages.json';
import { API_BASE_URL } from '../config';
import ManageInventory from './ManageInventory';


// ── Premium Toast Notification System ───────────────────────────────────────
let _toastDispatch = null;

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
    _toastDispatch = (type, message, duration = 4500) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, type, message, duration, visible: true }]);
    };
    window.notify = _toastDispatch;
    return () => { _toastDispatch = null; };
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
      {/* Dynamic Accent Left Stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: c.bg,
      }} />

      {/* Styled Round Icon Container */}
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

      {/* Text Context */}
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

      {/* Modern Close Icon */}
      <div style={{
        flexShrink: 0, color: '#94a3b8',
        fontSize: '14px', lineHeight: 1, padding: '4px',
        transition: 'color 0.2s',
      }}>✕</div>

      {/* Time Progress Line */}
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

const getTabFromPath = (path) => {
  const pathToTabMap = {
    '/user/dashboard': 'dashboard',
    '/user/inbox': 'inbox',
    '/user/crm/customers': 'customer_list',
    '/user/tracking': 'track_orders',
    '/user/crm/track-orders': 'track_orders',
    '/user/business-profile': 'business_profile',
    '/user/campaign/index': 'campaign_index',
    '/user/campaign/create': 'campaign_create',
    '/user/customer/list': 'customer_list',
    '/user/customer/create': 'customer_create',
    '/user/orders/list': 'orders_list',
    '/user/inventory': 'manage_inventory',
    '/user/agent/list': 'agent_list',
    '/user/agent/create': 'agent_create',
    '/user/saved-reply/index': 'saved_reply_index',
    '/user/saved-reply/create': 'saved_reply_create',
    '/user/whatsapp-account': 'whatsapp_account',
    '/user/subscription/index': 'subscription_index',
    '/user/subscription/monthly': 'subscription_monthly',
    '/user/subscription/yearly': 'subscription_yearly',
    '/user/profile-setting': 'profile_setting',
    '/user/development-credential': 'development_credential',
    '/user/ip-white-list/index': 'ip_white_list',
    '/user/twofactor': 'twofactor',
    '/user/change-password': 'change_password',
    '/user/contact/list': 'contact_list',
    '/user/contact-tag/list': 'contact_tag_list',
    '/user/contactlist/list': 'contactlist_list',
    '/user/automation/welcome-message': 'automation_welcome_message',
    '/user/flow-builder': 'flow_builder',
    '/user/automation/ai-bot': 'automation_ai_bot',
    '/user/shortlink/create': 'shortlink_create',
    '/user/shortlink/index': 'shortlink_index',
    '/user/floater/create': 'floater_create',
    '/user/floater/index': 'floater_index',
    '/user/cta-url/create': 'cta_url_create',
    '/user/cta-url/index': 'cta_url_index',
    '/user/interactive-list/create': 'interactive_list_create',
    '/user/interactive-list/index': 'interactive_list_index',
    '/user/ecommerce/woo-commerce/products': 'ecommerce_woocommerce_products',
    '/user/ecommerce/woo-commerce/config': 'ecommerce_woocommerce_config',
    '/user/deposit/history': 'deposit_history',
    '/user/withdraw/history': 'withdraw_history',
    '/user/transactions': 'transactions',
    '/user/whatsapp-pricing': 'whatsapp_pricing',
    '/user/referral/index': 'referral_index',
    '/user/template/create': 'template_create',
    '/user/template/create/carousel': 'template_create_carousel',
    '/user/template/index': 'template_index',
    '/help': 'help',
    '/user-guide': 'user_guide',
    '/user/agentbunny-assistant': 'agentbunny_assistant',
    '/ticket': 'ticket'
  };
  return pathToTabMap[path] || 'dashboard';
};

const getPathFromTab = (tabKey) => {
  const tabToPathMap = {
    dashboard: '/user/dashboard',
    inbox: '/user/inbox',
    crm_customers: '/user/customer/list',
    track_orders: '/user/tracking',
    business_profile: '/user/business-profile',
    campaign_index: '/user/campaign/index',
    campaign_create: '/user/campaign/create',
    customer_list: '/user/customer/list',
    customer_create: '/user/customer/create',
    orders_list: '/user/orders/list',
    manage_inventory: '/user/inventory',
    agent_list: '/user/agent/list',
    agent_create: '/user/agent/create',
    saved_reply_index: '/user/saved-reply/index',
    saved_reply_create: '/user/saved-reply/create',
    whatsapp_account: '/user/whatsapp-account',
    subscription_index: '/user/subscription/index',
    subscription_monthly: '/user/subscription/monthly',
    subscription_yearly: '/user/subscription/yearly',
    profile_setting: '/user/profile-setting',
    development_credential: '/user/development-credential',
    ip_white_list: '/user/ip-white-list/index',
    twofactor: '/user/twofactor',
    change_password: '/user/change-password',
    contact_list: '/user/contact/list',
    contact_tag_list: '/user/contact-tag/list',
    contactlist_list: '/user/contactlist/list',
    automation_welcome_message: '/user/automation/welcome-message',
    flow_builder: '/user/flow-builder',
    automation_ai_bot: '/user/automation/ai-bot',
    shortlink_create: '/user/shortlink/create',
    shortlink_index: '/user/shortlink/index',
    floater_create: '/user/floater/create',
    floater_index: '/user/floater/index',
    cta_url_create: '/user/cta-url/create',
    cta_url_index: '/user/cta-url/index',
    interactive_list_create: '/user/interactive-list/create',
    interactive_list_index: '/user/interactive-list/index',
    ecommerce_woocommerce_products: '/user/ecommerce/woo-commerce/products',
    ecommerce_woocommerce_config: '/user/ecommerce/woo-commerce/config',
    deposit_history: '/user/deposit/history',
    withdraw_history: '/user/withdraw/history',
    transactions: '/user/transactions',
    whatsapp_pricing: '/user/whatsapp-pricing',
    referral_index: '/user/referral/index',
    template_create: '/user/template/create',
    template_create_carousel: '/user/template/create/carousel',
    template_index: '/user/template/index',
    help: '/help',
    user_guide: '/user-guide',
    agentbunny_assistant: '/user/agentbunny-assistant',
    ticket: '/ticket'
  };
  return tabToPathMap[tabKey] || '/user/dashboard';
};

// Helper to generate a styled mockup page for links that are not scraped
const getMockPage = (tabKey) => {
  const titleMap = {
    orders_list: 'Manage Orders',
    contact_list: 'Manage Contacts',
    contact_tag_list: 'Manage Contact Tag',
    contactlist_list: 'Manage Contact List',
    automation_welcome_message: 'Welcome Message',
    flow_builder: 'Flow Builder',
    automation_ai_bot: 'AI Bots',
    shortlink_create: 'Create ShortLink',
    shortlink_index: 'Manage ShortLink',
    floater_create: 'Create Floater',
    floater_index: 'Manage Floater',
    cta_url_create: 'Create URL',
    cta_url_index: 'CTA URL List',
    interactive_list_create: 'Create List',
    interactive_list_index: 'Interactive List',
    ecommerce_woocommerce_products: 'Products',
    ecommerce_woocommerce_config: 'Config',
    deposit_history: 'Deposit History',
    withdraw_history: 'Withdrawal History',
    transactions: 'Transaction Logs',
    whatsapp_pricing: 'WhatsApp Pricing',
    referral_index: 'Manage Referrals',
    template_create: 'New Template',
    template_create_carousel: 'Carousel Template',
    template_index: 'All Templates',
    help: 'Help Center',
    user_guide: 'User Guide',
    agentbunny_assistant: 'AgentBunny AI Support',
    ticket: 'Support Tickets'
  };

  const title = titleMap[tabKey] || 'Tracking Packages';

  if (tabKey === 'agentbunny_assistant') {
    return {
      title: `AgentBunny - ${title}`,
      body: `
        <div class="dashboard-container">
          <div class="container-top">
            <div class="container-top__left">
              <h5 class="container-top__title">AgentBunny AI Support</h5>
              <p class="container-top__desc">Ask anything and get answers instantly from our AI Assistant</p>
            </div>
          </div>
          <div class="dashboard-container__body p-4">
            <div class="chat-container border rounded bg-white shadow-sm" style="height: 480px; display: flex; flex-direction: column;">
              <div class="chat-messages p-3 flex-grow-1 overflow-auto" style="background: #f8fafc;" id="mock-chat-messages">
                <div class="d-flex mb-3 align-items-start">
                  <div class="bg-success text-white rounded-circle p-2 me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                    <i class="las la-robot"></i>
                  </div>
                  <div class="bg-light p-3 rounded" style="max-width: 70%;">
                    <p class="mb-0 fs-14">Hello! I am your AgentBunny AI Assistant. How can I help you automate your WhatsApp Business workflow today?</p>
                  </div>
                </div>
              </div>
              <div class="chat-input-area border-top p-3 bg-white">
                <form class="d-flex gap-2" id="mock-chat-form" onsubmit="event.preventDefault(); const inp = document.getElementById('mock-chat-input'); if(!inp.value.trim()) return; const msgArea = document.getElementById('mock-chat-messages'); msgArea.innerHTML += '<div class=\\'d-flex mb-3 align-items-start justify-content-end\\'><div class=\\'bg-primary text-white p-3 rounded\\' style=\\'max-width: 70%;\\'><p class=\\'mb-0 fs-14\\'>' + inp.value + '</p></div></div>'; const val = inp.value; inp.value=''; setTimeout(() => { msgArea.innerHTML += '<div class=\\'d-flex mb-3 align-items-start\\'><div class=\\'bg-success text-white rounded-circle p-2 me-2 d-flex align-items-center justify-content-center\\' style=\\'width: 36px; height: 36px;\\'><i class=\\'las la-robot\\'></i></div><div class=\\'bg-light p-3 rounded\\' style=\\'max-width: 70%;\\'><p class=\\'mb-0 fs-14\\'>I received your query: \\'' + val + '\\'. Since this is a demo environment, I cannot connect to live servers, but the UI integrations are fully working!</p></div></div>'; msgArea.scrollTop = msgArea.scrollHeight; }, 1000); msgArea.scrollTop = msgArea.scrollHeight;">
                  <input type="text" class="form--control" placeholder="Ask AI something..." style="border-radius: 6px;" id="mock-chat-input">
                  <button type="submit" class="btn btn--base px-4 py-2" style="border-radius: 6px;"><i class="las la-paper-plane"></i> Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      `
    };
  }

  if (tabKey.endsWith('_create') || tabKey === 'template_create_carousel' || tabKey.endsWith('_config') || tabKey === 'automation_welcome_message') {
    let backRoute = tabKey.replace('_create', '_list').replace('_create', '_index').replace('welcome_message', 'ai_bot');
    if (tabKey === 'shortlink_create') backRoute = 'shortlink_index';
    if (tabKey === 'floater_create') backRoute = 'floater_index';
    if (tabKey === 'cta_url_create') backRoute = 'cta_url_index';
    if (tabKey === 'interactive_list_create') backRoute = 'interactive_list_index';
    if (tabKey === 'ecommerce_woocommerce_config') backRoute = 'ecommerce_woocommerce_products';
    if (tabKey === 'template_create_carousel') backRoute = 'template_index';

    const backPath = getPathFromTab(backRoute);

    return {
      title: `AgentBunny - ${title}`,
      body: `
        <div class="dashboard-container">
          <div class="container-top">
            <div class="container-top__left">
              <h5 class="container-top__title">${title}</h5>
              <p class="container-top__desc">Configure and customize settings below (Demo Mode)</p>
            </div>
            <div class="container-top__right">
              <div class="btn--group">
                <a href="${backPath}" class="btn btn--dark">
                  <i class="las la-undo"></i> Back
                </a>
                <button type="submit" form="mock-form" class="btn btn--base btn-shadow">
                  <i class="las la-save"></i> Save Changes
                </button>
              </div>
            </div>
          </div>
          <div class="dashboard-container__body">
            <div class="information-wrapper p-4 bg-white rounded shadow-sm">
              <form id="mock-form" class="row g-3">
                <div class="col-md-6">
                  <label class="form-label label-two required">Title / Name</label>
                  <input type="text" class="form--control form-two" placeholder="Enter name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label label-two">Category / Tag</label>
                  <input type="text" class="form--control form-two" placeholder="Enter category">
                </div>
                <div class="col-12">
                  <label class="form-label label-two required">Message Content / Configuration</label>
                  <textarea class="form--control form-two" rows="5" placeholder="Write contents..." required></textarea>
                </div>
                <div class="col-12 mt-4 text-end">
                  <button type="submit" class="btn btn--base px-4">Submit</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `
    };
  }

  const isHelp = tabKey === 'help' || tabKey === 'user_guide' || tabKey === 'ticket';
  
  // Set up Add New links inside dynamic mockup lists
  let createRoute = '';
  if (tabKey === 'contact_list') createRoute = 'contact_list'; // stay
  else if (tabKey === 'contact_tag_list') createRoute = 'contact_tag_list';
  else if (tabKey === 'contactlist_list') createRoute = 'contactlist_list';
  else if (tabKey === 'shortlink_index') createRoute = 'shortlink_create';
  else if (tabKey === 'floater_index') createRoute = 'floater_create';
  else if (tabKey === 'cta_url_index') createRoute = 'cta_url_create';
  else if (tabKey === 'interactive_list_index') createRoute = 'interactive_list_create';
  else if (tabKey === 'template_index') createRoute = 'template_create';

  const createPath = createRoute ? getPathFromTab(createRoute) : '#';

  return {
    title: `AgentBunny - ${title}`,
    body: `
      <div class="dashboard-container">
        <div class="container-top">
          <div class="container-top__left">
            <h5 class="container-top__title">${title}</h5>
            <p class="container-top__desc">Explore reports, records, and search items</p>
          </div>
          ${createRoute ? `
          <div class="container-top__right">
            <div class="btn--group">
              <a href="${createPath}" class="btn btn--base btn-shadow">
                <i class="las la-plus"></i> Add New
              </a>
            </div>
          </div>` : ''}
        </div>
        <div class="dashboard-container__body">
          ${tabKey !== 'whatsapp_pricing' ? `
          <div class="body-top">
            <div class="body-top__left">
              <form class="search-form">
                <input type="search" class="form--control" placeholder="Search here..." autocomplete="off">
                <span class="search-form__icon"> <i class="fa-solid fa-magnifying-glass"></i></span>
              </form>
            </div>
          </div>` : ''}
          <div class="dashboard-table">
            ${tabKey === 'whatsapp_pricing' ? `
              <table class="table table--responsive--lg">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Country Code</th>
                    <th>Meta Utility Rate</th>
                    <th>Meta Marketing Rate</th>
                    <th>Meta Authentication Rate</th>
                    <th>Meta Service Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sri Lanka</td>
                    <td>+94</td>
                    <td>රු2.40</td>
                    <td>රු4.80</td>
                    <td>රු2.40</td>
                    <td>රු1.20</td>
                  </tr>
                  <tr>
                    <td>India</td>
                    <td>+91</td>
                    <td>රු0.50</td>
                    <td>රු1.20</td>
                    <td>රු0.50</td>
                    <td>රු0.30</td>
                  </tr>
                  <tr>
                    <td>United States</td>
                    <td>+1</td>
                    <td>රු3.10</td>
                    <td>රු6.20</td>
                    <td>රු3.10</td>
                    <td>රු1.80</td>
                  </tr>
                </tbody>
              </table>
            ` : `
              <table class="table table--responsive--lg">
                <thead>
                  <tr>
                    <th>Title / Event</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="text-center empty-message-row">
                    <td colspan="100%" class="text-center">
                      <div class="py-5">
                        <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" class="empty-message" alt="No data">
                        <span class="d-block mt-2">No records found</span>
                        <span class="d-block fs-13 text-muted">There are no available data to display on this table at the moment.</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `
  };
};

// ── WhatsApp AI Bot Manager Component ───────────────────────────────────────
function WhatsAppAIBotManager({ user, activeSessionId }) {
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [config, setConfig] = useState({
    defaultModel: 'Gemini 1.5 Pro',
    systemPrompt: '',
    temperature: 0.6,
    typingDelay: 150,
    globalAIActive: true
  });

  const [sandboxMessages, setSandboxMessages] = useState([]);
  const [newSandboxText, setNewSandboxText] = useState('');
  const [simulating, setSimulating] = useState(false);

  const fetchAIConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const fetchSandboxHistory = async () => {
    const sandboxChatId = `${activeSessionId}_sandbox_user`;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/messages/${sandboxChatId}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': activeSessionId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxMessages(data);
      }
    } catch (err) {
      // Sandbox chat JID may not exist yet in DB - ignore
    }
  };

  useEffect(() => {
    fetchAIConfig();
    fetchSandboxHistory();
    // Poll sandbox messages to catch automated AI responses
    const interval = setInterval(fetchSandboxHistory, 2000);
    return () => clearInterval(interval);
  }, [activeSessionId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      if (window.notify) window.notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSandbox = async (e) => {
    e.preventDefault();
    if (!newSandboxText.trim()) return;

    const userText = newSandboxText;
    setNewSandboxText('');
    setSimulating(true);

    try {
      // 1. Simulate incoming message from sandbox client
      await fetch(`${API_BASE_URL}/whatsapp/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': activeSessionId
        },
        body: JSON.stringify({ message: userText, customerPhone: 'sandbox_user' })
      });
      
      // Instantly load sandbox history
      await fetchSandboxHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">WhatsApp AI Bot Settings</h5>
          <p className="container-top__desc">Configure automated conversational assistants for customer queries.</p>
        </div>
      </div>

      <div className="row gy-4 mt-2">
        {/* Left Side: Configuration Panel */}
        <div className="col-lg-8">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="label-two required form--label text-xs font-bold uppercase tracking-wider text-gray-400">Default Model</label>
                  <select 
                    value={config.defaultModel}
                    onChange={(e) => setConfig(prev => ({ ...prev, defaultModel: e.target.value }))}
                    className="form--control form-two w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:outline-none"
                  >
                    <option>Gemini 1.5 Pro</option>
                    <option>Gemini 1.5 Flash</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="label-two required form--label text-xs font-bold uppercase tracking-wider text-gray-400">Typing Speed Delay (ms/word)</label>
                  <input 
                    type="number"
                    value={config.typingDelay}
                    onChange={(e) => setConfig(prev => ({ ...prev, typingDelay: parseInt(e.target.value, 10) }))}
                    className="form--control form-two w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:outline-none"
                    min="50"
                    max="1000"
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="label-two required form--label text-xs font-bold uppercase tracking-wider text-gray-400">Max Chat History Messages</label>
                  <select 
                    value={config.maxHistoryLimit ?? 10}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxHistoryLimit: parseInt(e.target.value, 10) }))}
                    className="form--control form-two w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:outline-none"
                  >
                    <option value={5}>Last 5 messages</option>
                    <option value={10}>Last 10 messages</option>
                    <option value={15}>Last 15 messages</option>
                    <option value={20}>Last 20 messages</option>
                    <option value={30}>Last 30 messages (Expensive)</option>
                  </select>
                </div>

                <div className="col-md-6" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      checked={config.includeKbImages !== false}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeKbImages: e.target.checked }))}
                      id="includeKbImages"
                      className="w-4 h-4 accent-black rounded border-gray-200"
                    />
                    <label htmlFor="includeKbImages" className="text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer mb-0">Include KB images in photo requests (Vision Tokens)</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="label-two required form--label text-xs font-bold uppercase tracking-wider text-gray-400">Model Temperature</label>
                <div className="d-flex align-items-center gap-3">
                  <input 
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <span className="font-mono text-xs border px-3 py-1.5 rounded-lg bg-gray-50">{config.temperature}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="label-two required form--label text-xs font-bold uppercase tracking-wider text-gray-400">AI Persona & System Prompt</label>
                <textarea 
                  rows="6"
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="form--control form-two w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:outline-none text-sm font-light leading-relaxed"
                  placeholder="Instruct the AI on its character, business rules, catalog details, shipping, and refund guidelines..."
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox"
                    checked={config.globalAIActive}
                    onChange={(e) => setConfig(prev => ({ ...prev, globalAIActive: e.target.checked }))}
                    id="globalAIActive"
                    className="w-4 h-4 accent-black rounded border-gray-200"
                  />
                  <label htmlFor="globalAIActive" className="text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer mb-0">Activate Auto-Responder globally</label>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="btn btn--base py-3 px-5 flex items-center gap-2"
                  style={{ background: '#0a938a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                >
                  <i className="las la-save"></i> {isSaved ? 'Saved!' : 'Save Config'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Chat Sandbox Simulator */}
        <div className="col-lg-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[500px]" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
            <div className="p-4 border-b bg-[#f8fafc]/50 flex justify-between items-center rounded-t-3xl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">AI Chat Sandbox</span>
              </div>
              <button 
                onClick={() => setSandboxMessages([])}
                className="text-[10px] uppercase font-bold tracking-widest text-red-500 hover:text-red-600 border-none bg-transparent"
              >
                Clear
              </button>
            </div>

            {/* Sandbox Messages Log */}
            <div className="flex-grow p-4 space-y-3 bg-[#f8fafc] overflow-y-auto" style={{ flexGrow: 1, overflowY: 'auto' }}>
              {sandboxMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <span className="text-3xl" style={{ fontSize: '32px' }}>🤖</span>
                  <h6 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Test Your AI Persona</h6>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed max-w-xs" style={{ fontSize: '11px', lineHeight: '1.5' }}>
                    Type any message (e.g. "pricing", "delivery", or "hello") to test the custom prompt instructions and simulated responses.
                  </p>
                </div>
              ) : (
                sandboxMessages.map((msg, i) => (
                  <div 
                    key={msg.id || i}
                    className={`d-flex ${msg.sender === 'customer' ? 'justify-content-end' : 'justify-content-start'}`}
                    style={{ display: 'flex', justifyContent: msg.sender === 'customer' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}
                  >
                    <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'customer' 
                        ? 'bg-dark text-white rounded-tr-none' 
                        : 'bg-white border border-gray-200 text-neutral-700 rounded-tl-none shadow-sm'
                    }`} style={{ maxWidth: '75%', borderRadius: '16px', padding: '12px', fontSize: '12px' }}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {simulating && (
                <div className="d-flex justify-content-start" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-gray-400 italic">
                    Bot is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Sandbox Input */}
            <form onSubmit={handleSendSandbox} className="p-3 border-t bg-white flex gap-2 rounded-b-3xl" style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                value={newSandboxText}
                onChange={(e) => setNewSandboxText(e.target.value)}
                placeholder="Send message to bot..."
                className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-black focus:outline-none"
                style={{ fontSize: '12px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', flexGrow: 1 }}
              />
              <button 
                type="submit"
                className="px-3 bg-dark text-white hover:bg-neutral-800 rounded-xl text-xs font-bold uppercase tracking-wider"
                style={{ fontSize: '11px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px' }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}



// ── WhatsApp Account Manager Component ──────────────────────────────────────
function WhatsAppAccountManager({ activeSessionId, onSessionsUpdated, user }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [renamingSessionId, setRenamingSessionId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  
  // Linking flow state
  const [isLinking, setIsLinking] = useState(false);
  const [linkingSessionId, setLinkingSessionId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'pairing', 'connecting', 'qr', 'connected'
  const [authMethod, setAuthMethod] = useState('qr'); // 'qr', 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all user sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Poll connection status of the linking session if active
  useEffect(() => {
    if (!isLinking || !linkingSessionId) return;
    let active = true;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/whatsapp/status?sessionId=${linkingSessionId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        
        if (data.status === 'Connected') {
          setConnectionStatus('connected');
          setIsLinking(false);
          setLinkingSessionId(null);
          fetchSessions();
          if (onSessionsUpdated) onSessionsUpdated();
          if (window.notify) window.notify('success', 'WhatsApp Session connected successfully! 🎉');
        } else if (data.status === 'Pairing') {
          setConnectionStatus('pairing');
          setPairingCode(data.pairingCode || '');
        } else if (data.status === 'Connecting' || data.status === 'Pairing' || data.status === 'Connected') {
          if (data.qrUrl) {
            setConnectionStatus('qr');
            setQrUrl(data.qrUrl);
            setQrCodeGenerated(true);
          } else {
            setConnectionStatus('connecting');
          }
        } else {
          setConnectionStatus('disconnected');
          setPairingCode('');
          setQrUrl('');
        }
      } catch (err) {
        console.warn(err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isLinking, linkingSessionId]);

  const handleStartLinking = async () => {
    // Enforce limits
    const plan = user.plan || 'Free';
    let maxSessions = 1;
    if (plan === 'Premium') maxSessions = 3;
    if (plan === 'Enterprise') maxSessions = 10;

    if (sessions.length >= maxSessions) {
      if (window.notify) window.notify('warning', `Limit Reached: You have reached the maximum number of WhatsApp sessions (${maxSessions}) allowed for your ${plan} plan. Upgrade your plan to link more accounts.`);
      return;
    }

    setIsLinking(true);
    setConnectionStatus('disconnected');
    setQrCodeGenerated(false);
    setQrUrl('');
    setPairingCode('');
    setLinkingSessionId(null);
  };

  const handleLinkSession = async (method, phone = null) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ authMethod: method, phoneNumber: phone, sessionId: linkingSessionId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to request links');
      }
      const data = await res.json();
      setLinkingSessionId(data.sessionId);
      if (data.status === 'Pairing') {
        setConnectionStatus('pairing');
        setPairingCode(data.pairingCode || '');
      } else if (data.qrUrl) {
        setConnectionStatus('qr');
        setQrUrl(data.qrUrl);
        setQrCodeGenerated(true);
      } else {
        setConnectionStatus('connecting');
      }
    } catch (err) {
      if (window.notify) window.notify('error', err.message);
      setIsLinking(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPairingCode = (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    handleLinkSession('phone', phoneNumber);
  };

  const handleRename = async (sessionId) => {
    if (!renameVal.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/sessions/${sessionId}`, {
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
        fetchSessions();
        if (onSessionsUpdated) onSessionsUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async (sessionId) => {
    if (!confirm('Are you sure you want to disconnect this WhatsApp session?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': sessionId
        }
      });
      if (res.ok) {
        fetchSessions();
        if (onSessionsUpdated) onSessionsUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const plan = user.plan || 'Free';
  let maxSessions = 1;
  if (plan === 'Premium') maxSessions = 3;
  if (plan === 'Enterprise') maxSessions = 10;

  return (
    <div className="dashboard-container">
      <div className="container-top flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="container-top__left">
          <h5 className="container-top__title">Manage WhatsApp Accounts</h5>
          <p className="container-top__desc">Link up to {maxSessions} WhatsApp sessions for your {plan} plan, customize labels, and switch accounts.</p>
        </div>
        <div className="container-top__right">
          {!isLinking && (
            <button 
              disabled={sessions.length >= maxSessions}
              onClick={handleStartLinking} 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                border: 'none',
                cursor: sessions.length >= maxSessions ? 'not-allowed' : 'pointer',
                color: sessions.length >= maxSessions ? '#94a3b8' : '#ffffff',
                backgroundColor: sessions.length >= maxSessions ? '#f1f5f9' : '#000000',
                transition: 'background 0.2s'
              }}
            >
              <i className="las la-plus-circle" style={{ color: sessions.length >= maxSessions ? '#94a3b8' : '#ffffff', fontSize: '14px' }}></i> Connect New Session
            </button>
          )}
        </div>
      </div>

      {/* Linked Accounts List */}
      <div className="dashboard-container__body p-4 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
        {loadingSessions ? (
          <div className="text-center py-6 text-gray-400"><i className="las la-spinner la-spin"></i> Loading linked accounts...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 font-light">
            <p className="mb-4">No connected WhatsApp accounts found. Let's link your first business number!</p>
            <button onClick={handleStartLinking} className="btn btn-sm bg-[#00832e] text-white hover:bg-[#007027] px-4 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: '#00832e', border: 'none', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px' }}>
              Get Started
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table custom--table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px', width: '100%' }}>
              <thead>
                <tr>
                  <th className="text-xs font-bold uppercase tracking-wider text-gray-400" style={{ padding: '8px 16px' }}>Account Label</th>
                  <th className="text-xs font-bold uppercase tracking-wider text-gray-400" style={{ padding: '8px 16px' }}>Phone Number</th>
                  <th className="text-xs font-bold uppercase tracking-wider text-gray-400" style={{ padding: '8px 16px' }}>Connection Status</th>
                  <th className="text-xs font-bold uppercase tracking-wider text-gray-400 text-end" style={{ padding: '8px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <tr key={s.id} className="bg-[#f8fafc]/50 rounded-2xl" style={{ verticalAlign: 'middle', background: '#f8fafc' }}>
                      <td style={{ border: 'none', padding: '16px' }}>
                        {renamingSessionId === s.id ? (
                          <div className="d-flex align-items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="text" 
                              value={renameVal} 
                              onChange={(e) => setRenameVal(e.target.value)}
                              className="form-control form-control-sm border border-gray-300 rounded-lg px-2 py-1 text-xs" 
                              style={{ width: '150px' }}
                            />
                            <button onClick={() => handleRename(s.id)} className="btn btn-xs bg-emerald-500 text-white rounded-lg px-2 py-1" style={{ background: '#10b981', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}><i className="las la-check"></i></button>
                            <button onClick={() => setRenamingSessionId(null)} className="btn btn-xs bg-gray-400 text-white rounded-lg px-2 py-1" style={{ background: '#94a3b8', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}><i className="las la-times"></i></button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="font-bold text-neutral-800 text-sm" style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.session_name}</span>
                            {isActive && <span className="badge bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#065f46', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>Selected</span>}
                            <button 
                              onClick={() => { setRenamingSessionId(s.id); setRenameVal(s.session_name); }} 
                              className="btn btn-link text-gray-400 hover:text-gray-600 p-0"
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                              <i className="las la-edit"></i>
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ border: 'none', padding: '16px', fontFamily: 'monospace' }}>
                        {s.phone ? formatPhone(s.phone) : '—'}
                      </td>
                      <td style={{ border: 'none', padding: '16px' }}>
                        <span className={`badge text-[10px] font-bold px-3 py-1.5 rounded-full ${
                          s.status === 'Connected' ? 'bg-emerald-50 text-[#00832e] border border-emerald-100' :
                          s.status === 'Pairing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-red-50 text-red-500 border border-red-100'
                        }`} style={{
                          padding: '6px 12px',
                          borderRadius: '50px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          background: s.status === 'Connected' ? '#d1fae5' : s.status === 'Pairing' ? '#fef3c7' : '#fee2e2',
                          color: s.status === 'Connected' ? '#065f46' : s.status === 'Pairing' ? '#b45309' : '#991b1b'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td className="text-end" style={{ border: 'none', padding: '16px', textAlign: 'right' }}>
                        <div className="d-flex justify-content-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {!isActive && (
                            <button 
                              onClick={() => {
                                localStorage.setItem('agentbunny_active_session_id', s.id);
                                window.location.reload();
                              }}
                              className="btn btn-xs bg-black text-white hover:bg-neutral-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                              style={{ background: '#000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                            >
                              Select Active
                            </button>
                          )}
                          <button 
                            onClick={() => handleDisconnect(s.id)}
                            className="btn btn-xs bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            Disconnect
                          </button>
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

      {/* Account Link Handshake Interface */}
      {isLinking && (
        <div className="dashboard-container__body p-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h4 className="text-lg font-bold text-neutral-800" style={{ margin: 0 }}>Authentication Handshake</h4>
            <button onClick={() => setIsLinking(false)} className="btn btn-sm bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg px-3 py-1 text-xs" style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              Cancel Connection
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ gap: '24px' }}>
            <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="space-y-2">
                <p className="text-sm text-gray-400 font-light leading-relaxed" style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                  Scan the generated QR Code using your WhatsApp app Linked Devices screen, or generate an 8-character numeric pairing code directly.
                </p>
              </div>

              <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="flex gap-4" style={{ display: 'flex', gap: '16px' }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 text-sm" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50px', background: '#f1f5f9', fontWeight: 'bold' }}>1</div>
                  <div>
                    <h5 className="text-sm font-bold text-neutral-700" style={{ margin: 0 }}>Open WhatsApp on your phone</h5>
                    <p className="text-xs text-gray-400 font-light" style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>Tap Menu or Settings and select Linked Devices.</p>
                  </div>
                </div>
                <div className="flex gap-4" style={{ display: 'flex', gap: '16px' }}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 text-sm" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50px', background: '#f1f5f9', fontWeight: 'bold' }}>2</div>
                  <div>
                    <h5 className="text-sm font-bold text-neutral-700" style={{ margin: 0 }}>Pair your device</h5>
                    <p className="text-xs text-gray-400 font-light" style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>Scan the QR code on the right, or choose Phone Link mode.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-3xl p-6 shadow-sm bg-[#f8fafc]/50" style={{ border: '1px solid #f1f5f9', borderRadius: '24px', padding: '24px', background: '#f8fafc' }}>
              <div className="flex border-b border-gray-200 mb-6" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <button 
                  onClick={() => { setAuthMethod('qr'); setPairingCode(''); }}
                  className={`flex-1 pb-3 text-sm font-bold tracking-wider uppercase border-b-2 transition-all`}
                  style={{ flex: 1, background: 'none', border: 'none', borderBottom: authMethod === 'qr' ? '2px solid #00832e' : '2px solid transparent', color: authMethod === 'qr' ? '#00832e' : '#94a3b8', paddingBottom: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <i className="las la-qrcode me-1"></i> QR Code Scan
                </button>
                <button 
                  onClick={() => { setAuthMethod('phone'); setQrCodeGenerated(false); }}
                  className={`flex-1 pb-3 text-sm font-bold tracking-wider uppercase border-b-2 transition-all`}
                  style={{ flex: 1, background: 'none', border: 'none', borderBottom: authMethod === 'phone' ? '2px solid #00832e' : '2px solid transparent', color: authMethod === 'phone' ? '#00832e' : '#94a3b8', paddingBottom: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <i className="las la-phone me-1"></i> Phone Pairing Code
                </button>
              </div>

              {authMethod === 'qr' && (
                <div className="text-center p-4 space-y-6" style={{ textAlign: 'center' }}>
                  {qrCodeGenerated && qrUrl ? (
                    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="relative inline-flex p-4 bg-white border border-gray-200 rounded-2xl shadow-md" style={{ display: 'inline-flex', padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', margin: '0 auto' }}>
                        <img 
                          src={qrUrl} 
                          alt="WhatsApp Linking QR Code" 
                          style={{ width: '180px', height: '180px' }}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-600 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5" style={{ fontSize: '11px', color: '#00832e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <i className="las la-spinner la-spin text-success"></i> Waiting for phone scan...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-4" style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div className="p-4 bg-[#00832e]/5 text-[#00832e] inline-flex rounded-full" style={{ padding: '16px', borderRadius: '50px', background: '#ecfdf5', color: '#00832e' }}>
                        <i className="las la-mobile-alt" style={{ fontSize: '32px' }}></i>
                      </div>
                      <p className="text-xs text-gray-500 font-light max-w-xs mx-auto" style={{ fontSize: '12px', color: '#64748b', maxWidth: '280px' }}>Generate a single-use WhatsApp Web handshake QR code to bind your session.</p>
                      <button 
                        disabled={loading}
                        onClick={() => handleLinkSession('qr')} 
                        className="btn btn-sm btn-shadow bg-black hover:bg-neutral-800 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest qr-button-text-white"
                        style={{ background: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        <style>{`.qr-button-text-white { color: #ffffff !important; }`}</style>
                        {loading ? 'Generating...' : 'Generate QR Code'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {authMethod === 'phone' && (
                <div className="p-4 space-y-6">
                  {connectionStatus === 'pairing' ? (
                    <div className="text-center space-y-4" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider" style={{ fontSize: '11px', color: '#94a3b8' }}>Your Pairing Code</p>
                      <div className="flex flex-col items-center gap-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div className="font-mono text-3xl font-black text-neutral-900 bg-white border border-gray-200 py-4 px-6 rounded-2xl inline-block tracking-widest shadow-inner" style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', background: '#fff', border: '1px solid #e2e8f0', padding: '16px 24px', borderRadius: '16px', display: 'inline-block', letterSpacing: '4px', margin: '0 auto' }}>
                          {pairingCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pairingCode);
                            if (window.notify) window.notify('success', 'Pairing code copied to clipboard!');
                          }}
                          className="px-3 py-1.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] text-[10px] font-extrabold uppercase tracking-wider rounded-lg border-none cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <i className="las la-copy" style={{ fontSize: '13px' }}></i> Copy Code
                        </button>
                      </div>
                      <div className="space-y-1 text-left text-xs font-light text-gray-500 max-w-xs mx-auto bg-neutral-50 p-4 rounded-xl border border-gray-100" style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '12px', color: '#64748b' }}>
                        <p className="font-bold text-neutral-600 mb-1" style={{ fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>How to enter code:</p>
                        <p style={{ margin: '4px 0' }}>1. Open Linked Devices on your phone.</p>
                        <p style={{ margin: '4px 0' }}>2. Select "Link with Phone Number instead".</p>
                        <p style={{ margin: '4px 0' }}>3. Enter the 8-digit code shown above.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestPairingCode} className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400" style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>Phone Number (with Country Code)</label>
                        <input 
                          required
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. +94771234567"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none transition-colors"
                          style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        />
                      </div>
                      <button 
                        disabled={loading}
                        type="submit"
                        className="w-full bg-black text-white hover:bg-neutral-800 transition-all py-3 rounded-xl text-xs font-bold tracking-widest uppercase"
                        style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                      >
                        {loading ? 'Requesting...' : 'Request Pairing Code'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: Format raw WhatsApp phone numbers for display ────────────────────
// WhatsApp stores numbers without '+' (e.g. 94770135410790 instead of +94770135410790)
function formatPhone(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/\D/g, ''); // digits only
  if (cleaned.length === 0) return raw;
  // Return digits only — no + prefix (kept compact for UI)
  return cleaned;
}

// ── WhatsApp Interactive Inbox Component ─────────────────────────────────────
function WhatsAppInbox({ activeSessionId }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [simMessage, setSimMessage] = useState('');
  const [simPhone, setSimPhone] = useState('+94777890123');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editPhoneVal, setEditPhoneVal] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const [mediaFile, setMediaFile] = useState(null); // { file, preview, type }
  const fileInputRef = useRef(null);
  const [labelFilter, setLabelFilter] = useState('All'); // 'All', 'Confirmed', 'Cancelled', 'Interested'
  const [chatSearch, setChatSearch] = useState('');
  const [mobileInboxView, setMobileInboxView] = useState('list');

  // Poll chats list and connection status
  useEffect(() => {
    // Fetch quick replies once on mount
    fetch(`${API_BASE_URL}/quick-replies`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
    }).then(r => r.json()).then(data => setQuickReplies(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  // Poll chats list and connection status
  useEffect(() => {
    let active = true;
    const fetchChats = async () => {
      try {
        // First check connection
        const statusRes = await fetch(`${API_BASE_URL}/whatsapp/status`, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
            'x-session-id': activeSessionId
          }
        });
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();
        if (!active) return;
        
        setIsConnected(statusData.status === 'Connected');

        if (statusData.status === 'Connected') {
          const chatsRes = await fetch(`${API_BASE_URL}/whatsapp/chats`, {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
              'x-session-id': activeSessionId
            }
          });
          if (chatsRes.ok) {
            const chatsData = await chatsRes.json();
            setChats(chatsData);
          }
        }
      } catch (err) {
        console.warn('Inbox fetch failed:', err.message);
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeSessionId]);

  // Poll messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    let active = true;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/whatsapp/messages/${activeChatId}`, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
            'x-session-id': activeSessionId
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setMessages(data);
        }
      } catch (err) {
        console.warn('Messages poll failed:', err.message);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeChatId, activeSessionId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChatId) return;
    if (!newMsgText.trim() && !mediaFile) return;

    const textToSend = newMsgText;
    setNewMsgText('');
    setShowQuickReplies(false);

    // If media file is attached, send via send-media endpoint
    if (mediaFile) {
      const form = new FormData();
      form.append('file', mediaFile.file);
      form.append('chatId', activeChatId);
      if (textToSend.trim()) form.append('caption', textToSend.trim());
      setMediaFile(null);
      try {
        const res = await fetch(`${API_BASE_URL}/whatsapp/send-media`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
            'x-session-id': activeSessionId
          },
          body: form
        });
        if (res.ok) {
          const label = mediaFile.type.startsWith('image/') ? '🖼️ Image' : mediaFile.type.startsWith('video/') ? '🎥 Video' : '📎 ' + mediaFile.file.name;
          setMessages(prev => [...prev, { id: Math.random(), text: label, sender: 'agent', timestamp: new Date().toISOString() }]);
        }
      } catch (err) { console.error(err); }
      return;
    }

    // Text message
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': activeSessionId
        },
        body: JSON.stringify({ chatId: activeChatId, text: textToSend })
      });
      if (res.ok) {
        // Append local message instantly
        setMessages(prev => [...prev, { id: Math.random(), text: textToSend, sender: 'agent', timestamp: new Date().toISOString() }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateMessage = async (e) => {
    e.preventDefault();
    if (!simMessage.trim()) return;

    const msg = simMessage;
    setSimMessage('');

    try {
      await fetch(`${API_BASE_URL}/whatsapp/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': activeSessionId
        },
        body: JSON.stringify({ message: msg, customerPhone: simPhone })
      });
      if (window.notify) window.notify('success', 'Simulated message sent! Processing AI response...');
    } catch (e) {
      console.error(e);
    }
  };

  // Save corrected phone number for a contact
  const handleSavePhone = async (chatId, newPhone) => {
    const clean = newPhone.replace(/\D/g, '');
    if (clean.length < 7) return;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/chats/${encodeURIComponent(chatId)}/phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
          'x-session-id': activeSessionId
        },
        body: JSON.stringify({ phone: clean })
      });
      if (res.ok) {
        // Update local chats state immediately
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, sender_phone: clean } : c));
        setEditingPhone(false);
        setEditPhoneVal('');
      }
    } catch (e) {
      console.error('Phone update failed:', e);
    }
  };

  if (loadingChats) {
    return (
      <div className="p-8 text-center">
        <i className="las la-spinner la-spin text-[#00832e]" style={{ fontSize: '32px' }}></i>
        <p className="mt-2 text-sm text-gray-500">Loading inbox chats...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="whatsapp-empty-screen">
        <div className="whatsapp-empty-screen__backdrop"></div>
        <div className="whatsapp-empty-screen__glow whatsapp-empty-screen__glow--one"></div>
        <div className="whatsapp-empty-screen__glow whatsapp-empty-screen__glow--two"></div>

        <div className="whatsapp-empty-screen__content">
          <div className="whatsapp-empty-screen__art" aria-hidden="true">
            <div className="whatsapp-empty-screen__orbit whatsapp-empty-screen__orbit--one"></div>
            <div className="whatsapp-empty-screen__orbit whatsapp-empty-screen__orbit--two"></div>

            <div className="whatsapp-empty-screen__card whatsapp-empty-screen__card--top">
              <i className="lab la-whatsapp"></i>
              <span>Connected chat ready</span>
            </div>

            <div className="whatsapp-empty-screen__robot">
              <div className="whatsapp-empty-screen__head"></div>
              <div className="whatsapp-empty-screen__body"></div>
              <div className="whatsapp-empty-screen__leg whatsapp-empty-screen__leg--left"></div>
              <div className="whatsapp-empty-screen__leg whatsapp-empty-screen__leg--right"></div>
              <div className="whatsapp-empty-screen__arm whatsapp-empty-screen__arm--left"></div>
              <div className="whatsapp-empty-screen__arm whatsapp-empty-screen__arm--right"></div>
            </div>

            <div className="whatsapp-empty-screen__card whatsapp-empty-screen__card--bottom">
              <i className="las la-comment-dots"></i>
              <span>Messages will appear here</span>
            </div>
          </div>

          <div className="whatsapp-empty-screen__text">
            <p className="whatsapp-empty-screen__eyebrow">Welcome to your Inbox</p>
            <h1>Connect WhatsApp to start messaging</h1>
            <p className="whatsapp-empty-screen__desc">
              Connect a WhatsApp account to view synchronized chats, reply to contacts, and manage conversations from one place.
            </p>
            <button 
              type="button" 
              className="btn btn--base btn-shadow whatsapp-empty-screen__cta"
              onClick={() => { window.location.href = '/user/whatsapp-account'; }}
            >
              <i className="lab la-whatsapp"></i> Connect WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeChat = chats.find(c => c.id === activeChatId);

  const filteredChats = chats.filter(c => {
    // 1. Label filter
    if (labelFilter !== 'All') {
      if (labelFilter === 'New') {
        // "New" filter = chats with unread messages
        if (!c.unread_count || c.unread_count === 0) return false;
      } else {
        const chatLabel = c.label || 'None';
        if (chatLabel.toLowerCase() !== labelFilter.toLowerCase()) return false;
      }
    }
    // 2. Text search
    if (chatSearch.trim()) {
      const search = chatSearch.toLowerCase();
      const nameMatch = (c.sender_name || '').toLowerCase().includes(search);
      const phoneMatch = (c.sender_phone || '').includes(search);
      return nameMatch || phoneMatch;
    }
    return true;
  });

  return (
    <div className="dashboard-container">
      {/* Page Title (Desktop only) */}
      <div className="container-top hidden lg:flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="container-top__left">
          <h5 className="container-top__title">Conversations Inbox</h5>
          <p className="container-top__desc">Interact with clients and monitor AI assistant logs in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:mt-4 pb-14 lg:pb-0" style={{ height: 'calc(100vh - 210px)', minHeight: '520px', maxHeight: '680px' }}>
        
        {/* Left Side: Chats list */}
        <div className={`lg:col-span-1 bg-white lg:rounded-3xl lg:border lg:border-gray-100 lg:shadow-sm flex flex-col overflow-hidden ${mobileInboxView === 'list' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-[#f8fafc]/50 space-y-3">
            {/* Chats title on mobile */}
            <div className="lg:hidden flex justify-between items-center mb-1">
              <h1 className="text-2xl font-black text-neutral-900" style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Chats</h1>
            </div>
            
            <div className="relative">
              <input 
                type="search" 
                placeholder="Search..." 
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-[#00832e] transition-colors bg-neutral-50/50" 
              />
              <i className="las la-search" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
            </div>

            {/* Horizontal Scroll Filter Badges */}
            <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              <button 
                type="button"
                onClick={() => setLabelFilter('All')} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 border-none cursor-pointer ${
                  labelFilter === 'All' 
                    ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                    : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
                }`}
              >
                All
              </button>
              <button 
                type="button"
                onClick={() => setLabelFilter('Interested')} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 border-none cursor-pointer ${
                  labelFilter === 'Interested' 
                    ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                    : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
                }`}
              >
                Interested
              </button>
              <button 
                type="button"
                onClick={() => setLabelFilter('New')} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 border-none cursor-pointer ${
                  labelFilter === 'New' 
                    ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                    : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
                }`}
              >
                New
              </button>
              <button 
                type="button"
                onClick={() => setLabelFilter('Confirmed')} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 border-none cursor-pointer ${
                  labelFilter === 'Confirmed' 
                    ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                    : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
                }`}
              >
                Confirmed
              </button>
              <button 
                type="button"
                onClick={() => setLabelFilter('Cancelled')} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 border-none cursor-pointer ${
                  labelFilter === 'Cancelled' 
                    ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                    : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                {chats.length === 0 ? 'No active conversations yet.' : 'No conversations match this filter.'}
              </div>
            ) : (
              filteredChats.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => { setActiveChatId(c.id); setMobileInboxView('chat'); }}
                  className={`p-4 cursor-pointer flex items-center gap-3.5 transition-colors border-b border-[#f1f5f9] ${c.id === activeChatId ? 'bg-emerald-50/40 border-r-4 border-[#00832e]' : 'hover:bg-neutral-50/80'}`}
                >
                  {/* Avatar wrapper with absolute WhatsApp badge */}
                  <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                    {c.profile_pic_url ? (
                      <img 
                        src={c.profile_pic_url} 
                        alt={c.sender_name || 'Contact'}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-12 h-12 rounded-full bg-[#00832e]/10 text-[#00832e] items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ display: c.profile_pic_url ? 'none' : 'flex' }}
                    >
                      {c.sender_name ? c.sender_name.substring(0, 2).toUpperCase() : 'WA'}
                    </div>
                    {/* WhatsApp icon badge */}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-2px', 
                      right: '-2px', 
                      backgroundColor: '#25D366', 
                      border: '2px solid #ffffff', 
                      borderRadius: '50%', 
                      width: '18px', 
                      height: '18px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <i className="lab la-whatsapp" style={{ fontSize: '11px', color: '#ffffff', lineHeight: 1 }}></i>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h6 className="text-[13px] font-bold text-neutral-800 truncate mb-0" style={{ fontWeight: '700' }}>
                        {c.sender_name || formatPhone(c.sender_phone)}
                      </h6>
                      <span className="text-[10px] text-gray-400 font-medium ml-1 flex-shrink-0">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-gray-500 truncate mb-0 flex-1 pr-2" style={{ lineHeight: '1.4' }}>
                        {c.last_message}
                      </p>
                      
                      {/* Tags & Pills on the right side of the list */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {c.label && c.label !== 'None' && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            c.label === 'Confirmed' ? 'bg-[#d1fae5] text-[#065f46]' :
                            c.label === 'Cancelled' ? 'bg-[#fee2e2] text-[#991b1b]' :
                            'bg-[#dbeafe] text-[#1e40af]'
                          }`} style={{ fontSize: '8px', fontWeight: '800' }}>
                            {c.label}
                          </span>
                        )}

                        {c.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#00832e] text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 shadow-sm" style={{ fontWeight: '900' }}>
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Test message simulator */}
          <div className="p-4 border-t border-gray-100 bg-[#f8fafc]/50 hidden lg:block">
            <h6 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Simulate Client Message</h6>
            <form onSubmit={handleSimulateMessage} className="space-y-2">
              <input 
                type="text" 
                placeholder="Sender Phone (e.g. +94777890123)"
                value={simPhone} 
                onChange={e => setSimPhone(e.target.value)}
                className="w-full text-[11px] px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Hello AI..." 
                  value={simMessage}
                  onChange={e => setSimMessage(e.target.value)}
                  className="flex-1 text-[11px] px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
                />
                <button type="submit" className="btn btn-sm btn--base py-1 px-2.5 text-[10px] font-bold">Simulate</button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Message logs */}
        <div className={`lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden ${mobileInboxView === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          {activeChat ? (
            <>
              {/* Header */}
              <div className="border-b border-gray-100 bg-[#f8fafc]/50">
                {/* Top row: back + avatar + name + AI badge */}
                <div className="p-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileInboxView('list')}
                    className="lg:hidden flex-shrink-0 p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-none cursor-pointer flex items-center justify-center"
                    style={{ padding: '7px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}
                  >
                    <i className="las la-arrow-left" style={{ fontSize: '16px', fontWeight: 'bold' }}></i>
                  </button>

                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {activeChat.profile_pic_url ? (
                      <img 
                        src={activeChat.profile_pic_url} 
                        alt={activeChat.sender_name || 'Contact'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-10 h-10 rounded-full bg-[#00832e] text-white items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ display: activeChat.profile_pic_url ? 'none' : 'flex' }}
                    >
                      {activeChat.sender_name ? activeChat.sender_name.substring(0, 2).toUpperCase() : 'WA'}
                    </div>
                  </div>

                  {/* Name + phone (phone hidden on mobile) + AI badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h6 className="text-sm font-bold text-neutral-800 truncate mb-0" style={{ maxWidth: '140px' }}>
                        {activeChat.sender_name || formatPhone(activeChat.sender_phone)}
                      </h6>
                      <span className="text-[9px] text-emerald-600 flex items-center gap-1 font-semibold flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0"></span> AI On
                      </span>
                    </div>
                    {/* Phone — desktop only */}
                    <div className="hidden lg:flex items-center gap-1 mt-0.5">
                      {editingPhone ? (
                        <form
                          onSubmit={e => { e.preventDefault(); handleSavePhone(activeChat.id, editPhoneVal); }}
                          className="flex items-center gap-1"
                        >
                          <input
                            autoFocus
                            type="tel"
                            value={editPhoneVal}
                            onChange={e => setEditPhoneVal(e.target.value)}
                            placeholder="e.g. 94776671098"
                            className="text-[10px] font-mono px-2 py-0.5 border border-[#00832e] rounded-lg w-36 focus:outline-none"
                          />
                          <button type="submit" className="text-[#00832e] hover:text-emerald-700" title="Save">
                            <i className="las la-check-circle" style={{ fontSize: '14px' }}></i>
                          </button>
                          <button type="button" onClick={() => { setEditingPhone(false); setEditPhoneVal(''); }} className="text-gray-400 hover:text-gray-600" title="Cancel">
                            <i className="las la-times-circle" style={{ fontSize: '14px' }}></i>
                          </button>
                        </form>
                      ) : (
                        <>
                          {activeChat.sender_phone && (
                            <p className="text-[9px] text-gray-400 font-mono">{formatPhone(activeChat.sender_phone)}</p>
                          )}
                          <button
                            onClick={() => { setEditingPhone(true); setEditPhoneVal(activeChat.sender_phone || ''); }}
                            className="text-gray-300 hover:text-[#00832e] transition-colors ml-0.5"
                            title="Edit phone number"
                          >
                            <i className="las la-pen" style={{ fontSize: '11px' }}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status buttons row — full width below on mobile, inline on desktop */}
                <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-nowrap">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">Status:</span>
                  <div className="flex gap-1.5 flex-nowrap overflow-x-auto hide-scrollbar">

                    {/* Confirmed Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const newLabel = activeChat.label === 'Confirmed' ? 'None' : 'Confirmed';
                        try {
                          const res = await fetch(`${API_BASE_URL}/whatsapp/chats/${activeChat.id}/label`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
                              'x-session-id': activeSessionId
                            },
                            body: JSON.stringify({ label: newLabel })
                          });
                          if (res.ok) {
                            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, label: newLabel } : c));
                          }
                        } catch (err) {
                          console.error('Failed to update label:', err);
                        }
                      }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all border ${
                        activeChat.label === 'Confirmed'
                          ? 'bg-[#00832e] text-white border-[#00832e] shadow-sm'
                          : 'bg-[#f1f5f9] text-[#4a5d6e] border-transparent hover:bg-[#e2e8f0]'
                      }`}
                    >
                      Confirmed
                    </button>

                    {/* Cancelled Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const newLabel = activeChat.label === 'Cancelled' ? 'None' : 'Cancelled';
                        try {
                          const res = await fetch(`${API_BASE_URL}/whatsapp/chats/${activeChat.id}/label`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
                              'x-session-id': activeSessionId
                            },
                            body: JSON.stringify({ label: newLabel })
                          });
                          if (res.ok) {
                            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, label: newLabel } : c));
                          }
                        } catch (err) {
                          console.error('Failed to update label:', err);
                        }
                      }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all border ${
                        activeChat.label === 'Cancelled'
                          ? 'bg-[#00832e] text-white border-[#00832e] shadow-sm'
                          : 'bg-[#f1f5f9] text-[#4a5d6e] border-transparent hover:bg-[#e2e8f0]'
                      }`}
                    >
                      Cancelled
                    </button>

                    {/* Interested Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const newLabel = activeChat.label === 'Interested' ? 'None' : 'Interested';
                        try {
                          const res = await fetch(`${API_BASE_URL}/whatsapp/chats/${activeChat.id}/label`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('aura_token')}`,
                              'x-session-id': activeSessionId
                            },
                            body: JSON.stringify({ label: newLabel })
                          });
                          if (res.ok) {
                            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, label: newLabel } : c));
                          }
                        } catch (err) {
                          console.error('Failed to update label:', err);
                        }
                      }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all border ${
                        activeChat.label === 'Interested'
                          ? 'bg-[#00832e] text-white border-[#00832e] shadow-sm'
                          : 'bg-[#f1f5f9] text-[#4a5d6e] border-transparent hover:bg-[#e2e8f0]'
                      }`}
                    >
                      Interested
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 p-4 overflow-y-auto bg-neutral-50/50 space-y-3 flex flex-col">
                {messages.map(m => {
                  const isAgent = m.sender === 'agent' || m.sender === 'bot';
                  return (
                    <div 
                      key={m.id} 
                      className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${isAgent ? 'bg-[#00832e] text-white self-end rounded-tr-none' : 'bg-white text-neutral-800 border border-gray-100 self-start rounded-tl-none'}`}
                    >
                      <p className="mb-1" style={{ color: isAgent ? '#ffffff' : '#1e293b' }}>{m.text}</p>
                      <div className={`text-[9px] ${isAgent ? 'text-emerald-100' : 'text-gray-400'} text-right font-light`}>
                        {m.sender === 'bot' && <span className="font-bold me-1 uppercase" style={{ color: isAgent ? '#ffffff' : 'inherit' }}>[AI Bot]</span>}
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex flex-col gap-2" style={{ position: 'relative' }}>

                {/* Quick Replies Popup */}
                {showQuickReplies && quickReplies.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-1">
                      <i className="las la-bolt text-[#00832e] text-xs"></i>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Quick Replies</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {quickReplies
                        .filter(q => !quickFilter || q.shortcut.includes(quickFilter) || q.text.toLowerCase().includes(quickFilter))
                        .map(q => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => { setNewMsgText(q.text); setShowQuickReplies(false); setQuickFilter(''); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                          >
                            <span className="text-[10px] font-bold font-mono text-[#00832e] bg-emerald-50 px-1.5 py-0.5 rounded">{q.shortcut}</span>
                            <span className="text-xs text-neutral-700 truncate">{q.text}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Media preview strip */}
                {mediaFile && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl text-xs">
                    {mediaFile.type.startsWith('image/') ? (
                      <img src={mediaFile.preview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#00832e]/10 flex items-center justify-center">
                        <i className="las la-file-alt text-[#00832e]"></i>
                      </div>
                    )}
                    <span className="flex-1 truncate text-neutral-700 font-medium">{mediaFile.file.name}</span>
                    <button type="button" onClick={() => setMediaFile(null)} className="text-gray-400 hover:text-red-500">
                      <i className="las la-times"></i>
                    </button>
                  </div>
                )}

                {/* Input Row */}
                <div className="flex gap-2 items-center">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setMediaFile({ file: f, type: f.type, preview: URL.createObjectURL(f) });
                      e.target.value = '';
                    }}
                  />
                  {/* Paperclip button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#00832e] hover:border-[#00832e] transition-colors flex-shrink-0"
                    title="Attach media"
                  >
                    <i className="las la-paperclip"></i>
                  </button>

                  {/* Quick reply trigger button */}
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(v => !v)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors flex-shrink-0 ${
                      showQuickReplies ? 'border-[#00832e] text-[#00832e] bg-emerald-50' : 'border-gray-200 text-gray-500 hover:text-[#00832e] hover:border-[#00832e]'
                    }`}
                    title="Quick replies (/)"
                  >
                    <i className="las la-bolt"></i>
                  </button>

                  <input 
                    type="text" 
                    value={newMsgText} 
                    onChange={e => {
                      const val = e.target.value;
                      setNewMsgText(val);
                      if (val.startsWith('/')) {
                        setShowQuickReplies(true);
                        setQuickFilter(val.slice(1).toLowerCase());
                      } else {
                        setShowQuickReplies(false);
                        setQuickFilter('');
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Escape') { setShowQuickReplies(false); setQuickFilter(''); } }}
                    placeholder={mediaFile ? 'Add a caption (optional)...' : 'Type reply or / for quick replies...'}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#00832e] transition-colors"
                  />
                  <button
                    type="submit"
                    className="btn btn-sm btn--base px-4 py-2 flex items-center gap-1 flex-shrink-0"
                  >
                    <i className="las la-paper-plane"></i> Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <i className="las la-comments" style={{ fontSize: '48px' }}></i>
              <p className="mt-2 text-xs font-light">Select a conversation from the left to read and send messages.</p>
            </div>
          )}
        </div>

      </div>

      {/* HeyZappy-style Bottom Navigation (Mobile only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          <button
            type="button"
            onClick={() => { window.location.href = '/user/inbox'; }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full border-none bg-transparent cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <i className="las la-comments" style={{ fontSize: '22px', color: '#00832e' }}></i>
            <span style={{ fontSize: '10px', color: '#00832e', fontWeight: '700' }}>Chats</span>
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/user/products'; }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full border-none bg-transparent cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <i className="las la-box" style={{ fontSize: '22px', color: '#94a3b8' }}></i>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>Products</span>
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/user/whatsapp-account'; }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full border-none bg-transparent cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <i className="las la-cog" style={{ fontSize: '22px', color: '#94a3b8' }}></i>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/user/orders'; }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full border-none bg-transparent cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <i className="las la-shopping-bag" style={{ fontSize: '22px', color: '#94a3b8' }}></i>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>Orders</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function WhatsAppOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [logoUrl, setLogoUrl] = useState('');

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [courierName, setCourierName] = useState('Pronto');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('In Transit');
  const [isScanning, setIsScanning] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  const COURIER_LOGOS = {
    'SL Post': '/sri-lanka-post-logo.png',
    'Citypak': '/citypak-logo.png',
    'Aramex': '/aramex-logo.png',
    'DHL Express': 'https://th.bing.com/th?q=DHL+Logo+Icon+PNG&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-SG&cc=SG&setlang=en&adlt=strict&t=1&mw=247',
    'FedEx': 'https://th.bing.com/th/id/OIP.vuc88Kmi3r_f8yGuQPHVGgHaHa?w=169&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
    'Pronto': 'https://th.bing.com/th/id/OIP.U13AT8WXkPdZRaq4MD_ofwHaHa?w=176&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
    'Domex': '/domex-logo.png',
    'Koombiyo': '/koombiyo-logo.png',
    'Fardar': '/fardar-logo.png'
  };

  const FALLBACK_TRUCK = 'https://cdn-icons-png.flaticon.com/512/726/726458.png';

  const getCourierLogoUrl = (name) => {
    const norm = (name || '').toLowerCase();
    if (norm.includes('domex')) return '/domex-logo.png';
    if (norm.includes('koombiyo')) return '/koombiyo-logo.png';
    if (norm.includes('sri lanka post')) return '/sri-lanka-post-logo.png';
    if (norm.includes('citypak')) return '/citypak-logo.png';
    if (norm.includes('aramex')) return '/aramex-logo.png';
    if (norm.includes('fardar')) return '/fardar-logo.png';
    return COURIER_LOGOS[name] || FALLBACK_TRUCK;
  };

  const openTrackingModal = (order) => {
    setTrackingOrder(order);
    setCourierName(order.courier_name || 'Pronto');
    setTrackingNumber(order.tracking_number || '');
    setTrackingStatus(order.tracking_status || 'In Transit');
    setIsTrackingModalOpen(true);
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
    } catch (err) {
      console.warn('Camera not available or blocked, starting simulation mode', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSaveTrackingDetails = async (e) => {
    e.preventDefault();
    if (!trackingOrder) return;
    setUpdatingTracking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/crm/orders/${trackingOrder.id}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          courier_name: courierName,
          tracking_number: trackingNumber,
          tracking_status: trackingStatus
        })
      });

      if (res.ok) {
        if (window.notify) window.notify('success', 'Tracking details linked successfully!');
        setIsTrackingModalOpen(false);
        stopCamera();
        fetchOrders();
      } else {
        if (window.notify) window.notify('error', 'Failed to update tracking details.');
      }
    } catch (err) {
      if (window.notify) window.notify('error', err.message);
    } finally {
      setUpdatingTracking(false);
    }
  };

  const simulateScan = () => {
    const prefixes = { Pronto: 'PRN', Domex: 'DMX', Koombiyo: 'KMB', Aramex: 'ARX' };
    const prefix = prefixes[courierName] || 'TRK';
    const randNum = Math.floor(100000000 + Math.random() * 900000000);
    setTrackingNumber(`${prefix}-${randNum}`);
    if (window.notify) window.notify('success', 'Barcode scanned successfully!');
    stopCamera();
  };

  const [notificationPermission, setNotificationPermission] = useState('default');
  const seenOrderIdsRef = React.useRef(new Set());
  const isInitialLoadRef = React.useRef(true);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        setNotificationPermission(perm);
        if (perm === 'granted' && window.notify) {
          window.notify('success', 'Desktop notifications enabled successfully!');
        }
      });
    }
  };

  const fetchLogo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/business-profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.logo_url) {
          setLogoUrl(`${API_BASE_URL.replace('/api', '')}${data.logo_url}`);
        }
      }
    } catch (err) {
      console.warn('Failed to load brand logo for receipt:', err.message);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Check for new orders
        const newOrders = [];
        data.forEach(o => {
          if (!seenOrderIdsRef.current.has(o.id)) {
            seenOrderIdsRef.current.add(o.id);
            if (!isInitialLoadRef.current) {
              newOrders.push(o);
            }
          }
        });

        isInitialLoadRef.current = false;

        // If new orders exist, alert the merchant!
        if (newOrders.length > 0) {
          newOrders.forEach(o => {
            // Play a notification alert chime
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
            audio.play().catch(e => console.warn('Audio playback blocked by user interaction requirements:', e.message));

            // Trigger native browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Storefront Order Received! 🛍️', {
                body: `Order #${o.id} from ${o.shipping_details?.fullName || o.shipping_details?.name || 'Customer'} (Rs. ${parseFloat(o.total_amount).toFixed(2)})`,
                icon: '/agentbunny-logo-cropped.png',
                vibrate: [200, 100, 200]
              });
            }

            if (window.notify) {
              window.notify('success', `New Order #${o.id} received!`);
            }
          });
        }

        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchLogo();

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          setNotificationPermission(perm);
        });
      }
    }

    // Set polling interval for checking new orders every 15 seconds
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyDetails = (order) => {
    const ship = order.shipping_details || {};
    const itemsText = (Array.isArray(order.items) ? order.items : []).map(i => `${i.productName || i.name || i.product || 'Item'} x${i.quantity || i.qty || 1}`).join(', ');
    
    const details = `Order ID: #${order.id}\nRecipient: ${ship.fullName || ship.name || order.user_name || 'Customer'}\nPhone: ${ship.phone || ship.mobile || ''}\nAddress: ${ship.address || ''}\nProvince: ${ship.province || ship.city || ''}\nPayment Method: ${ship.payment_method || 'COD'}\nItems: ${itemsText}\nTotal Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}`;
    navigator.clipboard.writeText(details);
    if (window.notify) window.notify('success', 'Copied to clipboard!');
  };

  const printReceipt = (order) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    const items = Array.isArray(order.items) ? order.items : [];
    const ship = order.shipping_details || {};
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed #cccccc;">${item.productName || item.name || item.product || 'Product'}</td>
        <td style="padding: 8px 0; text-align: center; border-bottom: 1px dashed #cccccc;">${item.quantity || item.qty || 1}</td>
        <td style="padding: 8px 0; text-align: right; border-bottom: 1px dashed #cccccc;">Rs. ${parseFloat(item.price || order.total_amount).toFixed(2)}</td>
      </tr>
    `).join('');

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" style="max-height: 70px; object-fit: contain; margin-bottom: 10px; display: block;" />`
      : `<h2 style="margin: 0; font-family: sans-serif; letter-spacing: 1px;">RECEIPT</h2>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${order.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000000; line-height: 1.4; }
            .receipt-box { max-width: 400px; margin: 0 auto; border: 2px dashed #000000; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; }
            .details { margin-bottom: 20px; font-size: 14px; }
            .totals { border-top: 1px dashed #000000; padding-top: 10px; margin-top: 10px; }
            .totals-row { display: flex; justify-content: space-between; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              ${logoHtml}
              <div style="font-size: 12px; margin-top: 5px;">Thank you for shopping with us!</div>
            </div>
            
            <div class="details">
              <strong>Order ID:</strong> #${order.id}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
              <hr style="border: 0; border-top: 1px dashed #000000; margin: 10px 0;">
              <strong>Recipient:</strong> ${ship.fullName || ship.name || order.user_name || 'WhatsApp Customer'}<br>
              <strong>Phone:</strong> ${ship.phone || ship.mobile || ''}<br>
              <strong>Address:</strong> ${ship.address || ''}<br>
              <strong>Province:</strong> ${ship.province || ship.city || ''}<br>
              <strong>Payment:</strong> ${ship.payment_method || 'COD'}<br>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="text-align: left; border-bottom: 1px solid #000000; padding-bottom: 5px;">Item</th>
                  <th style="text-align: center; border-bottom: 1px solid #000000; padding-bottom: 5px;">Qty</th>
                  <th style="text-align: right; border-bottom: 1px solid #000000; padding-bottom: 5px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row" style="font-size: 16px;">
                <span>GRAND TOTAL</span>
                <span>Rs. ${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              *** END OF RECEIPT ***
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchName = (o.user_name || '').toLowerCase().includes(q) || (o.shipping_details?.fullName || '').toLowerCase().includes(q);
      const matchEmail = (o.user_email || '').toLowerCase().includes(q) || (o.shipping_details?.email || '').toLowerCase().includes(q);
      const matchCity = (o.shipping_details?.city || '').toLowerCase().includes(q);
      return matchId || matchName || matchEmail || matchCity;
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="container-top flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="container-top__left">
          <h5 className="container-top__title">Manage Orders</h5>
          <p className="container-top__desc">Monitor, track, and update customer storefront orders in real-time.</p>
        </div>
        
        {/* Status Filter Buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
            <button 
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                statusFilter === status 
                  ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                  : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {notificationPermission !== 'granted' && (
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-between text-xs text-amber-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <i className="las la-bell-slash text-base text-amber-600"></i>
            <span>Enable desktop push notifications to get real-time sound alarms when new customers place orders.</span>
          </div>
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold border-none cursor-pointer transition-colors shadow-sm text-[10px]"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Enable Alerts
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden mt-4">
        {/* Search header */}
        <div className="p-4 border-b border-gray-100 bg-[#f8fafc]/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h6 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0">
            Total Orders ({filteredOrders.length})
          </h6>
          <div className="relative w-full sm:w-64">
            <input 
              type="search" 
              placeholder="Search by ID, Customer name or city..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00832e] transition-colors bg-white/70" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <i className="las la-spinner la-spin text-[#00832e]" style={{ fontSize: '32px' }}></i>
              <p className="mt-2 text-sm text-gray-500">Loading orders list...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message mx-auto" alt="No data" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
              <span className="d-block mt-2 font-bold text-neutral-700 text-sm">No data found</span>
              <span className="d-block fs-13 text-muted text-xs mt-1">There are no available data to display on this table at the moment.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs" style={{ minWidth: '1150px' }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Shipping Info</th>
                  <th className="p-4">Logistics / Tracking</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map(o => {
                  const items = Array.isArray(o.items) ? o.items : [];
                  const ship = o.shipping_details || {};
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#00832e] whitespace-nowrap">
                        #{o.id}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-neutral-800">{ship.fullName || ship.name || o.user_name || 'Guest'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{ship.phone || ship.email || o.user_email}</div>
                      </td>
                      <td className="p-4 min-w-[220px]">
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="text-gray-600">
                              <span className="font-bold text-neutral-700">{item.productName || item.name || item.product || 'Product'}</span> 
                              {item.selectedSize && <span className="mx-1 text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">Size: {item.selectedSize}</span>}
                              {item.selectedColor && <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">Color: {item.selectedColor}</span>}
                              <span className="font-mono text-[#00832e] ml-1 font-bold">x{item.quantity || item.qty || 1}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-neutral-800 whitespace-nowrap">
                        Rs. {parseFloat(o.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 min-w-[250px]">
                        <div className="text-gray-700">{ship.address}</div>
                        <div className="font-medium text-neutral-800">{ship.province || ship.city} {ship.postalCode && `(${ship.postalCode})`}</div>
                        <div className="text-[10px] text-gray-400">{ship.payment_method || 'COD'}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {o.tracking_number ? (
                          <div className="flex items-center gap-2">
                            <img 
                              src={getCourierLogoUrl(o.courier_name)} 
                              alt={o.courier_name} 
                              style={{ width: '18px', height: '18px', objectFit: 'contain' }} 
                              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-800">{o.courier_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openTrackingModal(o)}
                              className="text-[#00832e] hover:text-emerald-700 ml-1 p-0.5 border border-transparent rounded bg-transparent cursor-pointer"
                              title="Edit Tracking"
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <i className="las la-edit" style={{ fontSize: '14px' }}></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openTrackingModal(o)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#00832e]/10 text-[#00832e] hover:bg-[#00832e] hover:text-white transition-all text-[10px] font-bold border-none cursor-pointer flex items-center gap-1"
                            style={{ border: 'none', cursor: 'pointer' }}
                          >
                            <i className="las la-shipping-fast" style={{ fontSize: '13px' }}></i> + Add Tracking
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-mono whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                            className="text-[10px] font-bold px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00832e] text-neutral-700 bg-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>

                          <button
                            onClick={() => copyDetails(o)}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-neutral-100 text-neutral-700 cursor-pointer transition-colors"
                            title="Copy Details"
                          >
                            <i className="las la-copy" style={{ fontSize: '14px' }}></i>
                          </button>

                          <button
                            onClick={() => printReceipt(o)}
                            className="p-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
                            title="Print Receipt"
                          >
                            <i className="las la-print" style={{ fontSize: '14px' }}></i>
                          </button>

                          <button
                            onClick={() => deleteOrder(o.id)}
                            className="p-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 cursor-pointer transition-colors"
                            title="Delete Order"
                          >
                            <i className="las la-trash" style={{ fontSize: '14px' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tracking Details Modal Dialog */}
      {isTrackingModalOpen && trackingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200" style={{ zIndex: 10000 }}>
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <i className="las la-truck-loading text-[#00832e]" style={{ fontSize: '24px' }}></i>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800" style={{ margin: 0 }}>Assign Logistics Details</h4>
                  <span className="text-[10px] text-gray-400 font-medium">Order ID: #{trackingOrder.id}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsTrackingModalOpen(false); stopCamera(); }}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center border-none text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <i className="las la-times" style={{ fontSize: '18px' }}></i>
              </button>
            </div>

            <form onSubmit={handleSaveTrackingDetails} className="space-y-4">
              {/* Courier Service selector */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Logistics Courier Partner</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-neutral-800 focus:outline-none focus:border-[#00832e] cursor-pointer"
                  style={{ display: 'block', width: '100%', padding: '8px 12px' }}
                >
                  {Object.keys(COURIER_LOGOS).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Courier Tracking input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tracking Reference Number</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter reference number or scan QR"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-neutral-800 focus:outline-none focus:border-[#00832e]"
                    style={{ padding: '8px 12px', width: '100%' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={isScanning ? stopCamera : startCamera}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center border-none transition-colors cursor-pointer ${
                      isScanning ? 'bg-rose-50 text-rose-600' : 'bg-neutral-50 text-gray-500 hover:bg-[#00832e]/10 hover:text-[#00832e]'
                    }`}
                    style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isScanning ? "Close Scanner" : "Scan Barcode / QR"}
                  >
                    <i className={isScanning ? "las la-times-circle" : "las la-camera"} style={{ fontSize: '18px' }}></i>
                  </button>
                </div>
              </div>

              {/* Barcode/QR Scanning Feed Overlay */}
              {isScanning && (
                <div className="bg-neutral-950 rounded-2xl overflow-hidden relative border border-neutral-800 flex flex-col items-center justify-center" style={{ height: '180px' }}>
                  {/* Glowing Laser Scanline Animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-[#00832e] shadow-[0_0_10px_#00832e] z-10 animate-scanline" style={{
                    animation: 'scanline 2s linear infinite',
                    top: '50%'
                  }}></div>
                  
                  {/* Camera view */}
                  <video 
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    playsInline 
                    muted
                  />

                  {/* Simulated scan trigger overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-center z-10">
                    <p className="text-[10px] text-gray-300 mb-2 font-medium">Position tracking barcode inside scanner window</p>
                    <button
                      type="button"
                      onClick={simulateScan}
                      className="px-3 py-1 bg-[#00832e] hover:bg-emerald-700 text-white rounded-full text-[10px] font-bold border-none cursor-pointer inline-flex items-center gap-1"
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      <i className="las la-barcode"></i> Simulate Scan
                    </button>
                  </div>

                  {/* Guide bracket box */}
                  <div className="absolute border-2 border-white/40 w-44 h-16 rounded-lg pointer-events-none z-10" style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                  }}></div>
                </div>
              )}

              {/* Tracking Status selector */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Current Courier Status</label>
                <select
                  value={trackingStatus}
                  onChange={(e) => setTrackingStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-neutral-800 focus:outline-none focus:border-[#00832e] cursor-pointer"
                  style={{ display: 'block', width: '100%', padding: '8px 12px' }}
                >
                  <option value="Sorting Hub">Sorting Hub</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsTrackingModalOpen(false); stopCamera(); }}
                  className="flex-1 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-neutral-600 font-bold text-xs cursor-pointer transition-colors"
                  style={{ border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTracking}
                  className="flex-1 py-2 rounded-xl bg-[#00832e] text-white hover:bg-emerald-700 font-bold text-xs cursor-pointer transition-colors"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  {updatingTracking ? 'Saving...' : 'Link Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserTransactions({ userTransactions }) {
  return (
    <div className="dashboard-container">
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Transaction Logs</h5>
          <p className="container-top__desc">Explore reports, records, and billing receipts</p>
        </div>
      </div>
      <div className="dashboard-container__body">
        <div className="dashboard-table">
          <table className="table table--responsive--lg">
            <thead>
              <tr>
                <th>Title / Event</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userTransactions.length === 0 ? (
                <tr className="text-center empty-message-row">
                  <td colSpan="6" className="text-center">
                    <div className="py-5">
                      <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message" alt="No data" style={{ width: '80px', opacity: 0.6 }} />
                      <span className="d-block mt-2">No records found</span>
                      <span className="d-block fs-13 text-muted">There are no available transaction records at the moment.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                userTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td data-label="Title / Event">
                      <span className="font-weight-bold">Plan Purchase / Upgrade</span>
                    </td>
                    <td data-label="Details">Upgraded to {tx.plan} Plan</td>
                    <td data-label="Amount"><strong>රු {parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td data-label="Status">
                      <span className={`badge`} style={{
                        padding: '4px 8px', borderRadius: '4px',
                        background: tx.status === 'Completed' ? '#d1e7dd' : tx.status === 'Failed' ? '#f8d7da' : '#fff3cd',
                        color: tx.status === 'Completed' ? '#0f5132' : tx.status === 'Failed' ? '#842029' : '#664d03',
                        fontWeight: 'bold', fontSize: '11px'
                      }}>
                        {tx.status}
                      </span>
                    </td>
                    <td data-label="Date">{new Date(tx.created_at).toLocaleString()}</td>
                    <td data-label="Action">
                      <button 
                        onClick={() => window.openInvoice(tx)}
                        className="btn btn--base btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: 'none' }}
                      >
                        <i className="las la-file-invoice-dollar"></i> View Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function Dashboard({ user, setUser, onLogout }) {
  // Initialize tab state dynamically based on the browser's current URL path
  const [tab, setTabState] = useState(() => getTabFromPath(window.location.pathname));

  const setTab = (newTab) => {
    const newPath = getPathFromTab(newTab);
    window.location.href = newPath;
  };

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('agentbunny_active_session_id') || '');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);

  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'error' | null

  // Stripe & Payment States
  const [savedCards, setSavedCards] = useState([]);
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [pendingClaimTrial, setPendingClaimTrial] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [isStripeScriptLoaded, setIsStripeScriptLoaded] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);

  const [stats, setStats] = useState({
    total_earned: 0,
    total_contacts: 0,
    total_tags: 0,
    total_lists: 0,
    active_flows: 0,
    ai_bots: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    total_ai_messages: 0,
    campaign_sent: 0,
    campaign_failed: 0,
    campaign_success_rate: 0,
    campaign_total: 0
  });

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401 || res.status === 403) {
        console.error('DEBUG AUTH: Invalid or expired token on dashboard stats fetch. Status:', res.status);
        if (onLogout) onLogout();
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0) {
          const exists = data.some(s => s.id === activeSessionId);
          if (!exists) {
            setActiveSessionId(data[0].id);
            localStorage.setItem('agentbunny_active_session_id', data[0].id);
          }
        } else {
          setActiveSessionId('');
          localStorage.removeItem('agentbunny_active_session_id');
        }
      } else if (res.status === 401 || res.status === 403) {
        console.error('DEBUG AUTH: Invalid or expired token on WhatsApp sessions fetch. Status:', res.status);
        if (onLogout) onLogout();
      }
    } catch (err) {
      console.error('Fetch sessions failed:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchDashboardStats();

      const fetchUserProfile = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
          });
          if (res.ok) {
            const updatedUser = await res.json();
            if (
              updatedUser.plan !== user.plan ||
              updatedUser.status !== user.status ||
              updatedUser.name !== user.name ||
              updatedUser.email !== user.email
            ) {
              if (setUser) setUser(updatedUser);
              localStorage.setItem('aura_user', JSON.stringify(updatedUser));
            }
          } else if (res.status === 401 || res.status === 403) {
            console.error('DEBUG AUTH: Invalid or expired token on profile fetch. Status:', res.status);
            if (onLogout) onLogout();
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      };
      fetchUserProfile();
    }
  }, [user, setUser]);

  // Confirm payment checkout session if session_id is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      const mockBillingCycle = params.get('billing_cycle') || 'Monthly';
      
      // Clean query parameters from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('mock');
      url.searchParams.delete('billing_cycle');
      window.history.replaceState(null, '', url.pathname + url.search);

      // Confirm session with backend
      fetch(`${API_BASE_URL}/payments/confirm-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ sessionId, billingCycle: mockBillingCycle })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (window.notify) window.notify('success', `Congratulations! Your plan has been successfully upgraded.`);
          // Reload user profile info dynamically to update layout immediately
          if (data.user) {
            localStorage.setItem('aura_user', JSON.stringify(data.user));
            // Trigger app state reload
            window.location.reload();
          } else {
            window.location.reload();
          }
        } else {
          if (window.notify) window.notify('error', data.error || 'Verification failed.');
        }
      })
      .catch(err => {
        console.error(err);
        if (window.notify) window.notify('error', 'Network error during payment confirmation.');
      });
    }
  }, []);

  // ── Stripe & Payments Integration Helpers ──────────────────────────────────
  const [isCardsLoading, setIsCardsLoading] = useState(false);

  const fetchSavedCards = async () => {
    setIsCardsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/methods`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedCards(data);
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    } finally {
      setIsCardsLoading(false);
    }
  };

  const fetchStripeKey = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/stripe-key`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStripePublicKey(data.stripeKey);
      }
    } catch (err) {
      console.error('Error fetching Stripe key:', err);
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/transactions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const openInvoice = (tx) => {
    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    if (!invoiceWindow) {
      if (window.notify) window.notify('warning', 'Pop-up blocker is enabled. Please allow pop-ups to view the invoice.');
      return;
    }

    const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const subtotal = parseFloat(tx.amount);
    const tax = 0.00;
    const total = subtotal + tax;

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${tx.id} - AgentBunny</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .invoice-title h2, .invoice-title h3 { display: inline-block; }
            .table > tbody > tr > .no-line { border-top: none; }
            .table > thead > tr > .no-line { border-bottom: none; }
            .table > tbody > tr > .thick-line { border-top: 2px solid #ddd; }
            .btn-print { margin-bottom: 20px; }
            @media print {
              .btn-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="row">
              <div class="col-12 text-end">
                <button onclick="window.print()" class="btn btn-success btn-print"><i class="las la-print"></i> Print Invoice</button>
              </div>
            </div>
            <div class="row">
              <div class="col-12">
                <div class="invoice-title d-flex justify-content-between align-items-center">
                  <h2>AgentBunny</h2>
                  <h3 class="text-muted">Invoice #${tx.id}</h3>
                </div>
                <hr>
                <div class="row mb-4">
                  <div class="col-6">
                    <address>
                      <strong>Billed To:</strong><br>
                      ${user?.full_name || 'Customer'}<br>
                      ${user?.email || ''}
                    </address>
                  </div>
                  <div class="col-6 text-end">
                    <address>
                      <strong>Shipped From:</strong><br>
                      AgentBunny Automation Ltd.<br>
                      Colombo, Sri Lanka
                    </address>
                  </div>
                </div>
                <div class="row mb-4">
                  <div class="col-6">
                    <address>
                      <strong>Payment Method:</strong><br>
                      Stripe Card Payment / Wallet<br>
                      Status: <span class="badge bg-success">${tx.status}</span>
                    </address>
                  </div>
                  <div class="col-6 text-end">
                    <address>
                      <strong>Order Date:</strong><br>
                      ${dateStr}
                    </address>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-12">
                <div class="panel panel-default">
                  <div class="panel-heading">
                    <h3 class="panel-title"><strong>Order Summary</strong></h3>
                  </div>
                  <div class="panel-body">
                    <div class="table-responsive">
                      <table class="table table-condensed">
                        <thead>
                          <tr>
                            <td><strong>Item</strong></td>
                            <td class="text-center"><strong>Price</strong></td>
                            <td class="text-center"><strong>Quantity</strong></td>
                            <td class="text-end"><strong>Totals</strong></td>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>AgentBunny ${tx.plan} Subscription (1 Month)</td>
                            <td class="text-center">රු ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td class="text-center">1</td>
                            <td class="text-end">රු ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td class="thick-line"></td>
                            <td class="thick-line"></td>
                            <td class="thick-line text-center"><strong>Subtotal</strong></td>
                            <td class="thick-line text-end">රු ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td class="no-line"></td>
                            <td class="no-line"></td>
                            <td class="no-line text-center"><strong>Tax / VAT</strong></td>
                            <td class="no-line text-end">රු 0.00</td>
                          </tr>
                          <tr>
                            <td class="no-line"></td>
                            <td class="no-line"></td>
                            <td class="no-line text-center"><strong>Total</strong></td>
                            <td class="no-line text-end"><strong>රු ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };
  window.openInvoice = openInvoice;

  const renderPurchaseHistoryHtml = () => {
    if (!userTransactions || userTransactions.length === 0) {
      return `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #64748b; font-size: 13px;">
            No purchase transactions recorded yet.
          </td>
        </tr>
      `;
    }

    return userTransactions.map(tx => {
      const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }) + ' ' + new Date(tx.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      // Calculate expiration date (30 days later)
      const expiry = new Date(tx.created_at);
      expiry.setDate(expiry.getDate() + 30);
      const expiryStr = expiry.toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }) + ' ' + expiry.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const amountStr = 'රු' + parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

      return `
        <tr>
          <td data-label="Plan Name">${tx.plan}</td>
          <td data-label="Purchase Price">${amountStr}</td>
          <td data-label="Discount Coupon">-</td>
          <td data-label="Purchase Date">${dateStr}</td>
          <td data-label="Expiration Date">${expiryStr}</td>
          <td data-label="Payment Method">Stripe / Card</td>
          <td data-label="Action">
            <button class="btn btn--base btn-shadow view-invoice-btn" data-tx-id="${tx.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer;">
              <i class="las la-eye"></i> View Invoice
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderSubscriptionBody = () => {
    let body = currentPage.body || '<h3>Page not found</h3>';

    // 1. Plan display names
    const displayPlan = user?.plan === 'Premium' || user?.plan === 'Pro' ? 'Pro' :
                        user?.plan === 'Enterprise' || user?.plan === 'Elite' ? 'Elite' :
                        'Free';

    const displayDesc = displayPlan === 'Pro' ? 'Advanced tools to manage customers, automate replies, and grow faster.' :
                        displayPlan === 'Elite' ? 'High-volume messaging, automation, and priority support for large teams.' :
                        'Get started for free to explore the product';

    const isYearlyUser = user?.billing_cycle === 'Yearly';
    const displayPrice = user?.status === 'Trial' ? 'Free Trial' :
                         displayPlan === 'Pro' ? (isYearlyUser ? 'රු30,000.00' : 'රු3,000.00') :
                         displayPlan === 'Elite' ? (isYearlyUser ? 'රු65,000.00' : 'රු6,200.00') :
                         'රු0.00';

    // Dates
    const latestTx = userTransactions[0];
    const purchaseAtDate = latestTx ? new Date(latestTx.created_at) : new Date(user?.joined_at || Date.now());
    
    // Format helper: DD-MM-YYYY hh:mm A
    const formatDate = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      const d = pad(date.getDate());
      const m = pad(date.getMonth() + 1);
      const y = date.getFullYear();
      let hr = date.getHours();
      const min = pad(date.getMinutes());
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12;
      hr = hr ? hr : 12; // 0 should be 12
      return `${d}-${m}-${y} ${pad(hr)}:${min} ${ampm}`;
    };

    const purchaseAtStr = displayPlan === 'Free' ? 'N/A' : formatDate(purchaseAtDate);
    const activatedOnStr = displayPlan === 'Free' ? 'N/A' : formatDate(purchaseAtDate);
    
    const nextBillingDate = new Date(purchaseAtDate);
    if (isYearlyUser) {
      nextBillingDate.setDate(nextBillingDate.getDate() + 365); // 1 year for yearly subscriptions
    } else {
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);  // 30 days for monthly
    }
    const nextBillingStr = displayPlan === 'Free' ? 'N/A' : formatDate(nextBillingDate);

    // Replace Plan Title and Card details dynamically
    body = body
      .replace(/<h4 class="active-card__title">\s*Free\s*<\/h4>/g, `<h4 class="active-card__title"> ${displayPlan}</h4>`)
      .replace(/<p class="active-card__desc">[^]*?<\/p>/, `<p class="active-card__desc">${displayDesc}</p>`)
      .replace(/රු0\.00/g, displayPrice)
      .replace(/26-06-2026 01:04 PM/g, purchaseAtStr)
      .replace(/26-07-2026 01:04 PM/g, nextBillingStr);

    // Inject yearly savings badges on the correct new yearly prices
    body = body
      .replace(/>රු<\/span>30,000\.00(\s*<\/span>\s*<\/h2>)/g, '>රු</span>30,000.00 <span class="offer-badge-pro">Save රු6,000</span>$1')
      .replace(/>රු<\/span>65,000\.00(\s*<\/span>\s*<\/h2>)/g, '>රු</span>65,000.00 <span class="offer-badge-elite">Save රු7,400</span>$1');

    // Update data-plan JSON prices in buttons (source JSON now has correct values already)
    body = body
      .replace(/&quot;monthly_price&quot;:&quot;3000\.00&quot;/g, '&quot;monthly_price&quot;:&quot;3000.00&quot;')
      .replace(/&quot;yearly_price&quot;:&quot;30000\.00&quot;/g, '&quot;yearly_price&quot;:&quot;30000.00&quot;')
      .replace(/&quot;monthly_price&quot;:&quot;6200\.00&quot;/g, '&quot;monthly_price&quot;:&quot;6200.00&quot;')
      .replace(/&quot;yearly_price&quot;:&quot;65000\.00&quot;/g, '&quot;yearly_price&quot;:&quot;65000.00&quot;');

    // Auto-check Auto Renewal toggle if on a paid/trial plan
    if (displayPlan !== 'Free') {
      body = body.replace(
        '<input class="form-check-input autoRenewal" type="checkbox" role="switch">',
        '<input class="form-check-input autoRenewal" type="checkbox" role="switch" checked>'
      );
    }

    // Feature remaining limits
    let accountLimit = '1';
    let agentLimit = '1';
    let contactLimit = '250';
    let templateLimit = '3';
    let flowLimit = '3';
    let campaignLimit = '10';
    let shortLinkLimit = 'Not Available';
    let floaterLimit = 'Not Available';

    if (displayPlan === 'Pro') {
      accountLimit = '3';
      agentLimit = '3';
      contactLimit = '1,000';
      templateLimit = '10';
      flowLimit = '5';
      campaignLimit = '50';
      shortLinkLimit = '3';
      floaterLimit = '3';
    } else if (displayPlan === 'Elite') {
      accountLimit = '10';
      agentLimit = 'Unlimited';
      contactLimit = 'Unlimited';
      templateLimit = 'Unlimited';
      flowLimit = 'Unlimited';
      campaignLimit = 'Unlimited';
      shortLinkLimit = 'Unlimited';
      floaterLimit = 'Unlimited';
    }

    body = body
      .replace(/(<span class="item-title">WhatsApp Account<\/span>[\s\S]*?)1([\s\S]*?<\/div>)/, `$1${accountLimit}$2`)
      .replace(/(<span class="item-title">Agent Limit<\/span>[\s\S]*?)1([\s\S]*?<\/div>)/, `$1${agentLimit}$2`)
      .replace(/(<span class="item-title">Contact Limit<\/span>[\s\S]*?)250([\s\S]*?<\/div>)/, `$1${contactLimit}$2`)
      .replace(/(<span class="item-title">Template Limit<\/span>[\s\S]*?)3([\s\S]*?<\/div>)/, `$1${templateLimit}$2`)
      .replace(/(<span class="item-title">Automation Flow Limit<\/span>[\s\S]*?)3([\s\S]*?<\/div>)/, `$1${flowLimit}$2`)
      .replace(/(<span class="item-title">Campaign Limit<\/span>[\s\S]*?)10([\s\S]*?<\/div>)/, `$1${campaignLimit}$2`)
      .replace(/(<span class="item-title">ShortLink Limit<\/span>[\s\S]*?)Not Available([\s\S]*?<\/div>)/, `$1${shortLinkLimit}$2`)
      .replace(/(<span class="item-title">Floater Limit<\/span>[\s\S]*?)Not Available([\s\S]*?<\/div>)/, `$1${floaterLimit}$2`);

    // Replace Renew button
    let activeCardBtnHtml = '';
    if (displayPlan === 'Free') {
      activeCardBtnHtml = `<button class="btn btn--base btn-shadow" onclick="document.querySelector('[data-tab-id=\\'pricing-plans\\']').click()" style="width: 100%; border: none;">Upgrade to Pro</button>`;
    } else if (displayPlan === 'Pro') {
      activeCardBtnHtml = `<button class="btn btn--base btn-shadow" onclick="document.querySelector('[data-tab-id=\\'pricing-plans\\']').click()" style="width: 100%; border: none;">Upgrade to Elite</button>`;
    } else {
      activeCardBtnHtml = `<button class="btn btn--base btn-shadow" onclick="document.querySelector('[data-tab-id=\\'pricing-plans\\']').click()" style="width: 100%; border: none;">Renew Subscription</button>`;
    }

    body = body.replace(/<button class="btn btn--base btn-shadow purchaseBtn"[^>]*>[^]*?<\/button>/, activeCardBtnHtml);

    // 2. Hide trial buttons if already claimed a trial, and always remove from Elite/Enterprise
    body = body.replace(/<button type="button" class="btn btn-outline--base w-100 mt-2 claim-trial-btn" data-plan-id="Elite"[^>]*>Start 14-Day Free Trial<\/button>/g, '');
    const showTrialButtons = user?.status !== 'Trial' && displayPlan === 'Free';
    if (!showTrialButtons) {
      body = body.replace(/<button type="button" class="btn btn-outline--base w-100 mt-2 claim-trial-btn"[^>]*>Start 14-Day Free Trial<\/button>/g, '');
    }

    // 3. Hide or replace the Free pricing column button ("Renew Now") depending on the active plan
    const freePricingBtnRegex = /<button class="btn btn--base w-100 purchaseBtn" data-plan="\{&quot;id&quot;:1,&quot;name&quot;:&quot;Free&quot;[^>]*>[^]*?<\/button>/g;
    if (displayPlan !== 'Free') {
      // Hide the Free plan button completely
      body = body.replace(freePricingBtnRegex, '');
    } else {
      // Replace with "Current Plan" disabled button
      const currentPlanBtnHtml = `<button class="btn w-100" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; cursor: not-allowed; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: bold;" disabled>Current Plan</button>`;
      body = body.replace(freePricingBtnRegex, currentPlanBtnHtml);
    }

    // 4. Purchase History list replace
    body = body.replace('__PURCHASE_HISTORY_ROWS__', renderPurchaseHistoryHtml());

    const isYearlyToggle = tab === 'subscription_yearly';
    if (isYearlyToggle) {
      body = body.replace('id="recurring_type"', 'id="recurring_type" checked');
      body = body.replaceAll('class="monthly_price"', 'class="monthly_price d-none"');
      body = body.replaceAll('class="yearly_price d-none"', 'class="yearly_price"');
    }

    // Pre-populate the modal's payment section with the saved cards
    const cardsHtml = renderModalPaymentSectionHtml(savedCards, isCardsLoading);
    body = body.replace('<div id="modal-payment-section"></div>', `<div id="modal-payment-section">${cardsHtml}</div>`);

    // CRITICAL: Strip the hardcoded wpp.raybeamdigital.com form action & method
    // so the browser NEVER does a native form redirect — JS handles submit instead
    body = body.replace(
      /(<form[^>]*class="[^"]*purchase-form[^"]*"[^>]*)\s+method="POST"\s+action="https?:\/\/[^"]*"/gi,
      '$1'
    );
    body = body.replace(
      /(<form[^>]*)\s+action="https?:\/\/wpp\.raybeamdigital\.com[^"]*"/gi,
      '$1'
    );
    body = body.replace(
      /action="https?:\/\/wpp\.raybeamdigital\.com[^"]*"/gi,
      ''
    );

    return body;
  };


  const handleClaimTrial = async (planId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/claim-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (window.notify) window.notify('success', `Congratulations! Your 14-day trial of ${planId} has been successfully activated.`);
        else alert(`Congratulations! Your 14-day trial of ${planId} has been successfully activated.`);
        
        // Update user state in localStorage and app context
        const savedUser = JSON.parse(localStorage.getItem('aura_user') || '{}');
        savedUser.plan = data.user.plan;
        savedUser.status = data.user.status;
        localStorage.setItem('aura_user', JSON.stringify(savedUser));
        
        // Force state reload by redirecting to refresh
        window.location.reload();
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to claim trial.');
        else alert(data.error || 'Failed to claim trial.');
      }
    } catch (err) {
      console.error('Error claiming trial:', err);
      if (window.notify) window.notify('error', 'Network error. Please try again.');
      else alert('Network error. Please try again.');
    }
  };

  const handleSetDefaultCard = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/methods/${cardId}/default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (window.notify) window.notify('success', 'Default payment method updated.');
        fetchSavedCards();
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to update default card.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Network error.');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/payments/methods/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (window.notify) window.notify('success', 'Payment method deleted successfully.');
        fetchSavedCards();
      } else {
        if (window.notify) window.notify('error', data.error || 'Failed to delete card.');
      }
    } catch (err) {
      console.error(err);
      if (window.notify) window.notify('error', 'Network error.');
    }
  };


  useEffect(() => {
    if (tab === 'subscription_index' || tab === 'subscription_monthly' || tab === 'subscription_yearly' || tab === 'transactions') {
      fetchUserTransactions();
    }
    if (tab === 'dashboard' || tab === 'subscription_index' || tab === 'subscription_monthly' || tab === 'subscription_yearly') {
      fetchSavedCards();
    }
    if (tab === 'subscription_index' || tab === 'subscription_monthly' || tab === 'subscription_yearly') {
      fetchStripeKey();
      
      // Load Stripe script
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          setIsStripeScriptLoaded(true);
        };
        document.head.appendChild(script);
      } else {
        setIsStripeScriptLoaded(true);
      }
    }
  }, [tab]);

  const renderModalPaymentSectionHtml = (cardsList, isLoading) => {
    if (isLoading) {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="font-weight: 600; font-size: 11px; color: #475569; margin: 0;">Select Payment Card</label>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; padding: 24px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; color: #00832e;">
          <i class="las la-spinner la-spin" style="font-size: 22px;"></i>
        </div>
      `;
    } else if (cardsList && cardsList.length > 0) {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="font-weight: 600; font-size: 11px; color: #475569; margin: 0;">Select Payment Card</label>
          <button type="button" id="modal-refresh-cards-btn" style="background: none; border: none; padding: 2px 6px; cursor: pointer; color: #00832e; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; font-weight: 700;">
            <i class="las la-sync-alt" style="font-size: 13px;"></i> Refresh Cards
          </button>
        </div>
        <div class="saved-cards-radio-group" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
          ${cardsList.map((card, idx) => `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid ${card.is_default ? '#00832e' : '#cbd5e1'}; background: ${card.is_default ? 'rgba(0, 131, 46, 0.02)' : '#ffffff'}; border-radius: 8px; cursor: pointer; font-size: 12px; color: #1e293b; margin: 0;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <input type="radio" name="payment_card_id" value="${card.stripe_payment_method_id}" ${card.is_default ? 'checked' : ''} style="accent-color: #00832e; width: 14px; height: 14px; margin: 0;">
                <strong style="text-transform: uppercase;">${card.card_brand}</strong> ending in **** ${card.card_last4}
              </span>
              ${card.is_default ? '<span style="font-size: 9px; font-weight: 700; color: #00832e; background: rgba(0, 131, 46, 0.1); padding: 1px 4px; border-radius: 4px;">DEFAULT</span>' : ''}
            </label>
          `).join('')}
        </div>
        <div id="modal-add-new-card-btn" class="premium-add-card-btn-inline">
          <i class="las la-plus-circle"></i> Add New Payment Card
        </div>
      `;
    } else {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="font-weight: 600; font-size: 11px; color: #475569; margin: 0;">Select Payment Card</label>
          <button type="button" id="modal-refresh-cards-btn" style="background: none; border: none; padding: 2px 6px; cursor: pointer; color: #00832e; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; font-weight: 700;">
            <i class="las la-sync-alt" style="font-size: 13px;"></i> Refresh Cards
          </button>
        </div>
        <div id="modal-add-new-card-btn" class="premium-add-card-box">
          <div class="icon-wrap">
            <i class="las la-plus-circle"></i>
          </div>
          <div class="text-content">
            <h6>Add Credit Card</h6>
          </div>
        </div>
      `;
    }
  };

  const updateModalPaymentSection = (cardsList, isLoading) => {
    // Select ALL elements with ID purchaseModal (both inside React container and moved to body by Bootstrap)
    const modals = document.querySelectorAll('#purchaseModal');
    modals.forEach(modal => {
      const paymentSection = modal.querySelector('#modal-payment-section');
      if (paymentSection) {
        paymentSection.innerHTML = renderModalPaymentSectionHtml(cardsList, isLoading);
      }
    });
  };

  useEffect(() => {
    updateModalPaymentSection(savedCards, isCardsLoading);
  }, [savedCards, isCardsLoading]);

  const renderSavedCardsHtml = () => {
    if (!savedCards || savedCards.length === 0) {
      return `
        <div class="col-12 text-center py-5" style="color: #64748b;">
          <div style="font-size: 40px; opacity: 0.4; margin-bottom: 10px;"><i class="las la-credit-card"></i></div>
          <p style="font-size: 13px; margin: 0;">No saved credit cards found. Click <strong>'Add Payment Method'</strong> to add one.</p>
        </div>
      `;
    }

    // ── Brand SVG logo helper — REAL brand colors ────────────────────────────
    const getCardBrandSvg = (brand) => {
      const b = (brand || '').toLowerCase();

      if (b === 'visa') {
        // Official Visa: deep navy blue background, white italic VISA
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#1A1F71"/>
          <text x="43" y="38" text-anchor="middle"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="26" font-weight="900" font-style="italic"
            fill="#FFFFFF" letter-spacing="-1">VISA</text>
        </svg>`;
      }

      if (b === 'mastercard') {
        // Official Mastercard: white pill, red left circle, orange-yellow right circle, orange overlap
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#FFFFFF"/>
          <circle cx="32" cy="27" r="17" fill="#EB001B"/>
          <circle cx="54" cy="27" r="17" fill="#F79E1B"/>
          <path d="M43 13.8a17 17 0 0 1 0 26.4 17 17 0 0 1 0-26.4z" fill="#FF5F00"/>
        </svg>`;
      }

      if (b === 'amex' || b === 'american_express') {
        // Official Amex: sky blue background, white AMEX
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#016FD0"/>
          <text x="43" y="37" text-anchor="middle"
            font-family="Arial Black, sans-serif"
            font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="2">AMEX</text>
        </svg>`;
      }

      if (b === 'discover') {
        // Official Discover: white background, "DISCOVER" dark text, orange circle
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#FFFFFF"/>
          <text x="16" y="22" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#231F20" letter-spacing="0.5">DISCOVER</text>
          <circle cx="60" cy="34" r="16" fill="#F76F20"/>
        </svg>`;
      }

      if (b === 'jcb') {
        // Official JCB: white background, 3 colored vertical pillars
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#FFFFFF"/>
          <rect x="12" y="8" width="20" height="38" rx="10" fill="#003087"/>
          <rect x="33" y="8" width="20" height="38" rx="10" fill="#CC0000"/>
          <rect x="54" y="8" width="20" height="38" rx="10" fill="#009F6B"/>
          <text x="22" y="31" text-anchor="middle" font-family="Arial Black" font-size="11" font-weight="900" fill="#FFFFFF">J</text>
          <text x="43" y="31" text-anchor="middle" font-family="Arial Black" font-size="11" font-weight="900" fill="#FFFFFF">C</text>
          <text x="64" y="31" text-anchor="middle" font-family="Arial Black" font-size="11" font-weight="900" fill="#FFFFFF">B</text>
        </svg>`;
      }

      if (b === 'unionpay') {
        // Official UnionPay: red + dark blue
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#CC0000"/>
          <rect x="28" y="0" width="58" height="54" rx="8" fill="#003087"/>
          <text x="54" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">UnionPay</text>
        </svg>`;
      }

      if (b === 'diners' || b === 'diners_club') {
        // Official Diners Club: white background, two overlapping blue circles
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
          <rect width="86" height="54" rx="8" fill="#FFFFFF"/>
          <circle cx="34" cy="27" r="18" fill="none" stroke="#004A97" stroke-width="3"/>
          <circle cx="52" cy="27" r="18" fill="none" stroke="#004A97" stroke-width="3"/>
        </svg>`;
      }

      // Generic fallback — white card silhouette
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 54" width="72" height="44">
        <rect width="86" height="54" rx="8" fill="#FFFFFF" opacity="0.85"/>
        <rect x="0" y="14" width="86" height="12" fill="#E5E7EB"/>
        <rect x="8" y="34" width="28" height="8" rx="3" fill="#9CA3AF"/>
      </svg>`;
    };


    return savedCards.map((card, idx) => {
      const brand = (card.card_brand || 'unknown').toLowerCase();
      const cardLabel = card.is_default ? 'PRIMARY METHOD' : 'BACKUP METHOD';

      // Card type label per brand
      const cardTypeLabels = {
        visa: 'Personal Card',
        mastercard: 'Business Card',
        amex: 'Premium Card',
        american_express: 'Premium Card',
        discover: 'Rewards Card',
        jcb: 'JCB Card',
        unionpay: 'UnionPay Card',
        diners: 'Diners Club',
        diners_club: 'Diners Club',
      };
      const cardType = cardTypeLabels[brand] || 'Credit Card';

      // Each card gets a slightly different hue for visual variety
      const hues = ['270deg', '220deg', '190deg', '310deg'];
      const hue = hues[idx % hues.length];

      const brandSvg = getCardBrandSvg(brand);

      return `
        <div class="col-lg-6 col-md-8 col-sm-10 mx-auto mx-lg-0" style="margin-bottom: 20px;">
          <div class="glass-credit-card" style="
            position: relative;
            width: 100%;
            min-height: 200px;
            border-radius: 20px;
            padding: 28px 28px 22px 28px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: linear-gradient(135deg, hsla(${hue}, 60%, 70%, 0.22) 0%, hsla(${hue}, 50%, 40%, 0.12) 100%);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid hsla(${hue}, 80%, 80%, 0.25);
            box-shadow: 0 8px 32px hsla(${hue}, 60%, 20%, 0.25), inset 0 1px 0 hsla(0, 0%, 100%, 0.18);
            cursor: default;
          ">
            <!-- Shimmer highlight overlay -->
            <div style="
              position: absolute;
              top: -60%;
              left: -30%;
              width: 180%;
              height: 120%;
              background: linear-gradient(105deg, transparent 40%, hsla(0,0%,100%,0.07) 50%, transparent 60%);
              pointer-events: none;
              transform: skewX(-15deg);
            "></div>

            <!-- Decorative circles -->
            <div style="position:absolute;right:-30px;top:-30px;width:140px;height:140px;border-radius:50%;background:hsla(${hue},70%,70%,0.12);pointer-events:none;"></div>
            <div style="position:absolute;right:40px;top:-60px;width:100px;height:100px;border-radius:50%;background:hsla(${hue},60%,60%,0.08);pointer-events:none;"></div>

            <!-- Top row: label & brand SVG logo -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">
              <div>
                <div style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:4px;">${cardLabel}</div>
                <div style="font-size:15px;font-weight:700;color:#ffffff;text-shadow:0 1px 6px rgba(0,0,0,0.3);">${cardType}</div>
              </div>
              <div style="display:flex;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25));">
                ${brandSvg}
              </div>
            </div>

            <!-- Chip icon -->
            <div style="position:relative;z-index:1;margin: 14px 0 10px 0;">
              <div style="
                width: 42px; height: 32px;
                border-radius: 6px;
                background: linear-gradient(135deg, rgba(255,215,100,0.7) 0%, rgba(200,160,50,0.6) 100%);
                border: 1px solid rgba(255,230,130,0.5);
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 2px;
                padding: 5px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              ">
                <div style="border-radius:2px;background:rgba(180,130,0,0.5);"></div>
                <div style="border-radius:2px;background:rgba(180,130,0,0.5);"></div>
                <div style="border-radius:2px;background:rgba(180,130,0,0.5);"></div>
                <div style="border-radius:2px;background:rgba(180,130,0,0.5);"></div>
              </div>
            </div>

            <!-- Card number -->
            <div style="position:relative;z-index:1;font-size:17px;font-family:monospace;letter-spacing:0.2em;color:#ffffff;text-shadow:0 1px 8px rgba(0,0,0,0.4);margin-bottom:14px;">
              ••••  ••••  ••••  ${card.card_last4}
            </div>

            <!-- Bottom row: holder & expiry -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;">
              <div>
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);margin-bottom:3px;">Card Holder</div>
                <div style="font-size:13px;font-weight:600;text-transform:uppercase;color:#ffffff;text-shadow:0 1px 4px rgba(0,0,0,0.3);">${(user?.name || 'CARD HOLDER').toUpperCase()}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);margin-bottom:3px;">Expires</div>
                <div style="font-size:13px;font-weight:600;color:#ffffff;text-shadow:0 1px 4px rgba(0,0,0,0.3);">12/29</div>
              </div>
            </div>
          </div>
          <!-- Card Action Buttons -->
          <div class="d-flex justify-content-between align-items-center mt-2.5 px-1">
            ${!card.is_default ? `
              <button class="btn btn-xs set-default-card-btn" data-card-id="${card.id}" style="padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; background: rgba(59, 26, 110, 0.08); color: #3b1a6e; border: 1px solid rgba(59, 26, 110, 0.15); cursor: pointer; transition: all 0.2s;">
                <i class="las la-check-circle"></i> Set Default
              </button>
            ` : `
              <span style="font-size: 11px; font-weight: bold; color: #3b1a6e; display: flex; align-items: center; gap: 4px; padding-left: 4px;">
                <i class="las la-check-circle" style="font-size: 14px;"></i> Primary Method
              </span>
            `}
            <button class="btn btn-xs delete-card-btn text-danger" data-card-id="${card.id}" style="padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; background: rgba(220, 38, 38, 0.08); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.15); cursor: pointer; transition: all 0.2s;">
              <i class="las la-trash-alt"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  };


  
  const [openDropdowns, setOpenDropdowns] = useState({
    contacts: false,
    templates: false,
    campaigns: false,
    automation: false,
    shortlink: false,
    floaters: false,
    cta: false,
    interactive: false,
    ecommerce: false,
    finance: false,
    help: false,
  });
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [prevTab, setPrevTab] = useState(() => getTabFromPath(window.location.pathname));
  const containerRef = useRef(null);

  // ── 1. Load AgentBunny CSS & JS assets once on mount ──────────────────────
  useEffect(() => {
    const stylesheets = [
      "https://wpp.raybeamdigital.com/assets/global/css/bootstrap.min.css",
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css",
      "https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom-animation.css?v=1",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/main.css?t=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom-fixes.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/color.php?color=00832e",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/apple-style.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/global/css/iziToast.min.css",
      "https://wpp.raybeamdigital.com/assets/global/css/iziToast_custom.css",
    ];
    stylesheets.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.dashboardAsset = 'true';
      document.head.appendChild(link);
    });

    // Inline CSS: loader + font-face + sidebar hover + inbox page styles
    const styleEl = document.createElement('style');
    styleEl.dataset.dashboardAsset = 'true';
    styleEl.textContent = [
      // Preloader & Spinner CSS matching the original site's keyframe speeds and style
      '.preloader{position:fixed;z-index:999999;background-color:#ffffff;width:100%;height:100%;top:0;left:0;display:flex;align-items:center;justify-content:center;}',
      '.loader{width:48px;height:48px;border:3px dotted #00832e;border-style:solid solid dotted dotted;border-radius:50%;display:inline-block;box-sizing:border-box;animation:rotation 1s linear infinite;position:absolute;top:0;left:0;right:0;bottom:0;margin:auto;}',
      '.loader::after{content:"";box-sizing:border-box;position:absolute;left:0;right:0;top:0;bottom:0;margin:auto;border:3px dotted rgba(0,131,46,0.5);border-style:solid solid dotted;width:24px;height:24px;border-radius:50%;animation:rotationBack 0.5s linear infinite;transform-origin:center center;}',
      '@keyframes rotation{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}',
      '@keyframes rotationBack{0%{transform:rotate(0deg);}100%{transform:rotate(-360deg);}}',
      // Fonts
      '@font-face{font-family:"Line Awesome Free";src:url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-solid-900.woff2") format("woff2");font-weight:900;font-style:normal;}',
      '@font-face{font-family:"Line Awesome Brands";src:url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-brands-400.woff2") format("woff2");font-weight:normal;font-style:normal;}',
      '@font-face{font-family:"Line Awesome Free";src:url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-regular-400.woff2") format("woff2");font-weight:400;font-style:normal;}',
      '@font-face{font-family:"Font Awesome 5 Free";src:url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff2") format("woff2");font-weight:900;font-style:normal;}',
      '@font-face{font-family:"Font Awesome 5 Free";src:url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-regular-400.woff2") format("woff2");font-weight:400;font-style:normal;}',
      '@font-face{font-family:"Font Awesome 5 Brands";src:url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-brands-400.woff2") format("woff2");font-weight:normal;font-style:normal;}',
      '@font-face{font-family:"Font Awesome 6 Free";src:url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff2") format("woff2");font-weight:900;font-style:normal;}',
      // Sidebar hover and collapse styling restricted strictly to desktop screens (width >= 992px)
      '@media(min-width:992px){.dashboard .sidebar-menu:hover{width:280px!important;}.dashboard .sidebar-menu:hover .sidebar-menu-list__link .text{display:inline-block!important;opacity:1!important;visibility:visible!important;}.dashboard .sidebar-menu:hover .sidebar-menu-list__title{display:block!important;}body .sidebar-menu .sidebar-logo{display:flex!important; opacity:1!important; visibility:visible!important;}body .sidebar-menu .sidebar-logo img{display:block!important; max-height:48px!important; object-fit:contain!important; margin:0 auto!important; opacity:1!important; visibility:visible!important;}.brand-text{display:none!important;}.sidebar-menu:hover .brand-text{display:block!important;}.dashboard .sidebar-menu:not(:hover) .sidebar-logo img{display:block!important;}.dashboard .sidebar-menu:not(:hover) .sidebar-logo__link::after{display:none!important;}.dashboard .sidebar-menu:not(:hover) .sidebar-logo{margin:20px 0!important; padding:0!important; justify-content:center!important;}.dashboard .sidebar-menu:hover .sidebar-logo__link::after{display:none!important;}.dashboard .sidebar-menu:hover .sidebar-menu-list__item.has-dropdown>.sidebar-menu-list__link::after{display:block!important;}}',
      // High-performance mobile viewport locks to prevent horizontal side-swipes and sidebar wiggling
      '@media(max-width:991px){html,body{overflow-x:hidden!important;position:relative!important;width:100%!important;}.sidebar-menu{position:fixed!important;top:0!important;bottom:0!important;left:-280px!important;width:280px!important;height:100%!important;z-index:10005!important;transition:left 0.3s cubic-bezier(0.4,0,0.2,1)!important;overflow-y:auto!important;box-shadow:0 0 20px rgba(0,0,0,0.15)!important;}.sidebar-menu.show-sidebar{left:0!important;}body .sidebar-menu .brand-text,body .sidebar-menu:hover .brand-text,body .sidebar-menu .sidebar-logo .brand-text,body .sidebar-menu:hover .sidebar-logo .brand-text,body .brand-text,.sidebar-menu .brand-text,.sidebar-menu:hover .brand-text{display:none!important;}.sidebar-logo{display:flex!important;flex-direction:column!important;align-items:center!important;gap:8px!important;margin:0!important;padding:20px 10px!important;}.sidebar-menu .sidebar-logo img{display:block!important;max-height:48px!important;object-fit:contain!important;margin:0 auto!important;}}',
      // Inbox whatsapp-empty-screen
      '.whatsapp-empty-screen{position:relative;min-height:calc(100vh - 140px);display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at top left,rgba(0,122,109,.08),transparent 32%),radial-gradient(circle at bottom right,rgba(37,211,102,.10),transparent 28%),linear-gradient(180deg,#f7faf9 0%,#f3f6f5 100%);padding:32px 18px;}',
      '.whatsapp-empty-screen__backdrop,.whatsapp-empty-screen__glow{position:absolute;border-radius:999px;pointer-events:none;}',
      '.whatsapp-empty-screen__backdrop{inset:0;background-image:linear-gradient(rgba(0,122,109,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,122,109,.03) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(circle at center,black 52%,transparent 100%);opacity:.55;}',
      '.whatsapp-empty-screen__glow--one{width:260px;height:260px;left:10%;top:14%;background:rgba(37,211,102,.10);filter:blur(14px);animation:whatsappGlowFloat 8s ease-in-out infinite;}',
      '.whatsapp-empty-screen__glow--two{width:180px;height:180px;right:12%;bottom:14%;background:rgba(0,122,109,.08);filter:blur(14px);animation:whatsappGlowFloat 10s ease-in-out infinite reverse;}',
      '.whatsapp-empty-screen__content{position:relative;z-index:1;width:min(100%,980px);display:grid;grid-template-columns:1.1fr .9fr;gap:24px;align-items:center;}',
      '.whatsapp-empty-screen__art{position:relative;min-height:420px;display:flex;align-items:center;justify-content:center;}',
      '.whatsapp-empty-screen__orbit{position:absolute;border:1px solid rgba(0,122,109,.12);border-radius:50%;animation:whatsappOrbit 14s linear infinite;}',
      '.whatsapp-empty-screen__orbit--one{width:280px;height:280px;}',
      '.whatsapp-empty-screen__orbit--two{width:360px;height:360px;animation-duration:18s;border-style:dashed;opacity:.55;}',
      '.whatsapp-empty-screen__robot{position:relative;width:250px;height:300px;animation:whatsappRobotFloat 4.5s ease-in-out infinite;}',
      '.whatsapp-empty-screen__head,.whatsapp-empty-screen__body,.whatsapp-empty-screen__leg,.whatsapp-empty-screen__arm{position:absolute;background:#fff;border:2px solid rgba(0,122,109,.18);box-shadow:0 18px 40px rgba(31,41,51,.08);}',
      '.whatsapp-empty-screen__head{width:88px;height:72px;left:81px;top:8px;border-radius:18px 18px 12px 12px;}',
      '.whatsapp-empty-screen__head::before,.whatsapp-empty-screen__head::after{content:"";position:absolute;width:10px;height:10px;top:26px;border-radius:50%;background:#007a6d;}',
      '.whatsapp-empty-screen__head::before{left:22px;}.whatsapp-empty-screen__head::after{right:22px;}',
      '.whatsapp-empty-screen__body{width:160px;height:150px;left:45px;top:78px;border-radius:42px 42px 26px 26px;}',
      '.whatsapp-empty-screen__body::before{content:"";position:absolute;width:92px;height:18px;left:32px;top:28px;border-radius:999px;background:linear-gradient(90deg,rgba(0,122,109,.10),rgba(37,211,102,.28),rgba(0,122,109,.10));}',
      '.whatsapp-empty-screen__body::after{content:"";position:absolute;width:58px;height:12px;left:51px;top:62px;border-radius:999px;background:rgba(31,41,51,.16);box-shadow:0 18px 0 rgba(31,41,51,.08);}',
      '.whatsapp-empty-screen__arm,.whatsapp-empty-screen__leg{border-radius:999px;background:linear-gradient(180deg,#fff,#f6fbfa);}',
      '.whatsapp-empty-screen__arm--left{width:88px;height:18px;left:0;top:128px;transform:rotate(-4deg);transform-origin:right center;}',
      '.whatsapp-empty-screen__arm--right{width:88px;height:18px;right:0;top:128px;transform:rotate(4deg);transform-origin:left center;}',
      '.whatsapp-empty-screen__leg{width:22px;height:56px;top:228px;}.whatsapp-empty-screen__leg--left{left:76px;}.whatsapp-empty-screen__leg--right{right:76px;}',
      '.whatsapp-empty-screen__card{position:absolute;display:inline-flex;align-items:center;gap:10px;padding:11px 16px;border-radius:16px;background:rgba(255,255,255,.88);border:1px solid rgba(0,122,109,.10);color:#526672;font-size:13px;font-weight:500;box-shadow:0 12px 30px rgba(31,41,51,.08);backdrop-filter:blur(10px);animation:whatsappCardFloat 5s ease-in-out infinite;}',
      '.whatsapp-empty-screen__card i{font-size:18px;color:#007a6d;}',
      '.whatsapp-empty-screen__card--top{top:34px;left:20px;}.whatsapp-empty-screen__card--bottom{bottom:24px;right:30px;animation-delay:.8s;}',
      '.whatsapp-empty-screen__text{position:relative;padding:16px 4px;max-width:430px;}',
      '.whatsapp-empty-screen__eyebrow{margin:0 0 12px;color:#007a6d;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}',
      '.whatsapp-empty-screen__text h1{margin:0 0 14px;color:#1f2933;font-size:clamp(26px,3vw,38px);line-height:1.15;font-weight:600;letter-spacing:-.02em;}',
      '.whatsapp-empty-screen__desc{margin:0 0 24px;color:#5f6f77;font-size:15px;line-height:1.75;font-weight:400;max-width:410px;}',
      '.whatsapp-empty-screen__cta{padding-left:22px;padding-right:22px;}',
      '@keyframes whatsappRobotFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
      '@keyframes whatsappOrbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
      '@keyframes whatsappGlowFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.04)}}',
      '@keyframes whatsappCardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '@media(max-width:991px){.whatsapp-empty-screen__content{grid-template-columns:1fr;justify-items:center;text-align:center}.whatsapp-empty-screen__text{padding-top:0}.whatsapp-empty-screen__desc{margin-left:auto;margin-right:auto}}',
      '@media(max-width:575px){.whatsapp-empty-screen{min-height:calc(100vh - 110px);padding:22px 14px}.whatsapp-empty-screen__art{min-height:320px;transform:scale(.84)}.whatsapp-empty-screen__robot{width:220px;height:260px}.whatsapp-empty-screen__card--top{top:-15px!important;}}',
      '.whatsapp-pin-toggle{position:absolute;top:50%;right:12px;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:#667085;display:inline-flex;align-items:center;justify-content:center;font-size:18px;}',
      '.whatsapp-pin-toggle:hover,.whatsapp-pin-toggle:focus{background:rgba(15,118,110,.08);color:#0f766e;outline:none;}',
      /* ── Glassmorphism Credit Card ─────────────────────────────── */
      '.glass-credit-card{transition:transform 0.3s ease, box-shadow 0.3s ease;}',
      '.glass-credit-card:hover{transform:translateY(-4px) scale(1.01);}',
      /* Shimmer sweep animation on hover */
      '.glass-credit-card::before{content:"";position:absolute;top:0;left:-75%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);transform:skewX(-20deg);transition:left 0.6s ease;pointer-events:none;z-index:2;}',
      '.glass-credit-card:hover::before{left:130%;}',
    ].join('\n');

    document.head.appendChild(styleEl);

    // Load scripts sequentially
    const scripts = [
      "https://wpp.raybeamdigital.com/assets/global/js/jquery-3.7.1.min.js",
      "https://wpp.raybeamdigital.com/assets/global/js/bootstrap.bundle.min.js",
      "https://wpp.raybeamdigital.com/assets/templates/basic/js/main.js?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/global/js/iziToast.min.js",
    ];
    let mounted = true;
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setIsPageLoading(false);
      }
    }, 2500);

    (async () => {
      for (const src of scripts) {
        if (!mounted) break;
        await new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = src;
          s.dataset.dashboardAsset = 'true';
          s.onload = resolve;
          s.onerror = resolve;
          document.body.appendChild(s);
        });
      }
      if (mounted) {
        clearTimeout(safetyTimeout);
        setIsPageLoading(false); // Done loading initial assets!
      }
    })();
    document.body.classList.add('dashboard-body-active');

    return () => {
      mounted = false;
      document.body.classList.remove('dashboard-body-active');
      document.querySelectorAll('[data-dashboard-asset="true"]').forEach((el) => el.remove());
    };
  }, []);

  // ── 1b. Remove/Fade Out static preloader on load ─────────────────────────
  useEffect(() => {
    if (!isPageLoading) {
      const staticLoader = document.getElementById('preloader-static');
      if (staticLoader) {
        staticLoader.style.transition = 'opacity 0.4s ease';
        staticLoader.style.opacity = '0';
        const timer = setTimeout(() => {
          staticLoader.remove();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isPageLoading]);

  // ── 2. Sync URL bar when state 'tab' changes ─────────────────────────────
  useEffect(() => {
    const expectedPath = getPathFromTab(tab);
    if (window.location.pathname !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
    }
  }, [tab]);

  // ── 3. Listen to browser Back/Forward navigation popstate events ────────
  useEffect(() => {
    const handlePopState = () => {
      const activeTab = getTabFromPath(window.location.pathname);
      setTab(activeTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── 4. Handle page transition spinner on tab changes ─────────────────────
  useEffect(() => {
    if (tab !== prevTab) {
      setIsPageLoading(true);
      setPrevTab(tab);
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [tab, prevTab]);

  // ── 5. Re-initialize Bootstrap carousels whenever the tab changes ────────
  useEffect(() => {
    const init = () => {
      if (!window.bootstrap) return;
      document.querySelectorAll('[data-bs-ride="carousel"]').forEach((el) => {
        try {
          const existing = window.bootstrap.Carousel.getInstance(el);
          if (existing) existing.dispose();
          new window.bootstrap.Carousel(el, {
            ride: 'carousel',
            interval: parseInt(el.dataset.bsInterval || '5000', 10),
          });
        } catch (_) {}
      });
    };
    // Bootstrap JS loads async – poll until ready
    let attempts = 0;
    const tryInit = () => {
      if (window.bootstrap) {
        init();
      } else if (attempts++ < 30) {
        setTimeout(tryInit, 200);
      }
    };
    tryInit();
  }, [tab]);

  // ── 6. Intercept clicks & form submits for SPA routing ───────────────────
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Check for Add Payment Method button click
      const addPaymentBtn = e.target.closest('#add-payment-method-btn');
      if (addPaymentBtn) {
        e.preventDefault();
        setIsStripeModalOpen(true);
        return;
      }

      // Check for main page Claim Free Trial click
      const claimFreeTrialBtn = e.target.closest('#claim-free-trial-btn');
      if (claimFreeTrialBtn) {
        e.preventDefault();
        if (savedCards && savedCards.length > 0) {
          handleClaimTrial('Premium');
        } else {
          setPendingClaimTrial(true);
          setIsStripeModalOpen(true);
          if (window.notify) {
            window.notify('info', 'Please add a payment card to claim your 14-day free trial.');
          }
        }
        return;
      }

      // Check for Claim Trial button click
      const claimTrialBtn = e.target.closest('.claim-trial-btn');
      if (claimTrialBtn) {
        e.preventDefault();
        const planId = claimTrialBtn.getAttribute('data-plan-id');
        handleClaimTrial(planId);
        return;
      }

      // Check for billing cycle toggle click
      const recurringTypeToggle = e.target.closest('#recurring_type');
      if (recurringTypeToggle) {
        const isChecked = recurringTypeToggle.checked;
        const subContainer = e.target.closest('.dashboard-container__body') || document;
        const monthlySpans = subContainer.querySelectorAll('.monthly_price');
        const yearlySpans = subContainer.querySelectorAll('.yearly_price');
        monthlySpans.forEach(span => {
          if (isChecked) {
            span.classList.add('d-none');
          } else {
            span.classList.remove('d-none');
          }
        });
        yearlySpans.forEach(span => {
          if (isChecked) {
            span.classList.remove('d-none');
          } else {
            span.classList.add('d-none');
          }
        });
      }

      // Check for Purchase Button click (to open the modal and populate data)
      const purchaseBtn = e.target.closest('.purchaseBtn');
      if (purchaseBtn) {
        e.preventDefault();
        const planDataStr = purchaseBtn.getAttribute('data-plan');
        if (planDataStr) {
          try {
            const planData = JSON.parse(planDataStr);
            const modal = document.getElementById('purchaseModal');
            if (modal) {
              // Store active plan data on the modal element
              modal.setAttribute('data-active-plan', planDataStr);

              // Populate modal fields
              const planNameSpan = modal.querySelector('.plan_name');
              if (planNameSpan) {
                let displayName = planData.name;
                if (displayName === 'Premium') displayName = 'Pro';
                else if (displayName === 'Enterprise') displayName = 'Elite';
                planNameSpan.innerText = displayName;
              }
              
              const isYearly = document.getElementById('recurring_type')?.checked || false;
              const durationSpan = modal.querySelector('.duration');
              if (durationSpan) durationSpan.innerText = isYearly ? 'Yearly' : 'Monthly';
              
              const priceVal = isYearly ? planData.yearly_price : planData.monthly_price;
              const priceSpan = modal.querySelector('.price');
              if (priceSpan) priceSpan.innerText = `රු${parseFloat(priceVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              
              const pricingPlanIdInput = modal.querySelector('#pricing_plan_id');
              if (pricingPlanIdInput) pricingPlanIdInput.value = planData.name;
              
              const planRecurringSelect = modal.querySelector('#plan_recurring');
              if (planRecurringSelect) {
                planRecurringSelect.value = isYearly ? '2' : '1';
                // Trigger change event
                planRecurringSelect.dispatchEvent(new Event('change', { bubbles: true }));
              }
              // Also directly update select2 container span if it exists in DOM
              const select2ContainerSpan = modal.querySelector('#select2-plan_recurring-container');
              if (select2ContainerSpan) {
                select2ContainerSpan.innerText = isYearly ? 'Yearly' : 'Monthly';
                select2ContainerSpan.setAttribute('title', isYearly ? 'Yearly' : 'Monthly');
              }

              // Populate dynamic payment section & load cards
              updateModalPaymentSection([], true);
              fetchSavedCards();
              
              // Show bootstrap modal
              if (window.bootstrap && window.bootstrap.Modal) {
                const bsModal = new window.bootstrap.Modal(modal);
                bsModal.show();
              } else {
                modal.classList.add('show');
                modal.style.display = 'block';
                document.body.classList.add('modal-open');
              }
            }
          } catch (err) {
            console.error('Error parsing plan data:', err);
          }
        }
        return;
      }

      // Check for Refresh Cards inside Purchase Modal
      const modalRefreshCardsBtn = e.target.closest('#modal-refresh-cards-btn');
      if (modalRefreshCardsBtn) {
        e.preventDefault();
        // Add a spinning effect to the icon for nice UX
        const icon = modalRefreshCardsBtn.querySelector('i');
        if (icon) {
          icon.style.transform = 'rotate(360deg)';
          icon.style.transition = 'transform 0.5s ease';
          setTimeout(() => {
            icon.style.transform = 'none';
            icon.style.transition = 'none';
          }, 500);
        }
        fetchSavedCards();
        return;
      }

      // Check for Add New Card inside Purchase Modal
      const modalAddNewCardBtn = e.target.closest('#modal-add-new-card-btn');
      if (modalAddNewCardBtn) {
        e.preventDefault();
        setIsStripeModalOpen(true);
        return;
      }

      // Check for modal close click (fallback)
      const dismissModalBtn = e.target.closest('[data-bs-dismiss="modal"]') || e.target.closest('.btn-close');
      if (dismissModalBtn) {
        const modal = dismissModalBtn.closest('.modal');
        if (modal && modal.style.display === 'block') {
          modal.classList.remove('show');
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
        }
      }

      // Check for Set Default Card button click
      const setDefaultBtn = e.target.closest('.set-default-card-btn');
      if (setDefaultBtn) {
        e.preventDefault();
        const cardId = setDefaultBtn.getAttribute('data-card-id');
        handleSetDefaultCard(cardId);
        return;
      }

      // Check for Delete Card button click
      const deleteCardBtn = e.target.closest('.delete-card-btn');
      if (deleteCardBtn) {
        e.preventDefault();
        const cardId = deleteCardBtn.getAttribute('data-card-id');
        handleDeleteCard(cardId);
        return;
      }

      // Check for View Invoice button click
      const viewInvoiceBtn = e.target.closest('.view-invoice-btn');
      if (viewInvoiceBtn) {
        e.preventDefault();
        const txId = parseInt(viewInvoiceBtn.getAttribute('data-tx-id'), 10);
        const tx = userTransactions.find(t => t.id === txId);
        if (tx) {
          openInvoice(tx);
        }
        return;
      }

      // Check for Auto Renewal toggle click
      const autoRenewalToggle = e.target.closest('.autoRenewal');
      if (autoRenewalToggle) {
        // Toggle state check
        const isChecked = autoRenewalToggle.checked;
        fetch(`${API_BASE_URL}/payments/toggle-auto-renewal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
          },
          body: JSON.stringify({ autoRenewal: isChecked })
        }).then(async (res) => {
          if (res.ok) {
            const statusText = isChecked ? 'ON' : 'OFF';
            if (window.notify) window.notify('success', `Auto-renewal has been turned ${statusText}.`);
            // Update local user state
            const savedUser = JSON.parse(localStorage.getItem('aura_user') || '{}');
            savedUser.auto_renewal = isChecked;
            localStorage.setItem('aura_user', JSON.stringify(savedUser));
            
            // Reload user session state dynamically if needed or show success log
            console.log(`Auto-renewal persisted: ${isChecked}`);
          } else {
            const data = await res.json();
            if (window.notify) window.notify('error', data.error || 'Failed to update auto-renewal.');
            autoRenewalToggle.checked = !isChecked; // revert
          }
        }).catch(err => {
          console.error(err);
          if (window.notify) window.notify('error', 'Network error.');
          autoRenewalToggle.checked = !isChecked; // revert
        });
        return;
      }

      const anchor = e.target.closest('a');
      if (anchor) {
        // Custom route attribute handling for mockup page buttons
        const routeAttr = anchor.getAttribute('data-route');
        if (routeAttr) {
          e.preventDefault();
          setTab(routeAttr);
          return;
        }

        if (anchor.href) {
          const href = anchor.href;
          if (href.includes('/user/dashboard'))            { e.preventDefault(); setTab('dashboard'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/inbox'))           { e.preventDefault(); setTab('inbox'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/template/create/carousel')) { e.preventDefault(); setTab('template_create_carousel'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/template/create'))          { e.preventDefault(); setTab('template_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/template/index'))           { e.preventDefault(); setTab('template_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/campaign/index'))  { e.preventDefault(); setTab('campaign_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/campaign/create')) { e.preventDefault(); setTab('campaign_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/customer/list'))   { e.preventDefault(); setTab('customer_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/customer/create')) { e.preventDefault(); setTab('customer_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/orders/list'))     { e.preventDefault(); setTab('orders_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/agent/list'))      { e.preventDefault(); setTab('agent_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/agent/create'))    { e.preventDefault(); setTab('agent_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/saved-reply/index'))  { e.preventDefault(); setTab('saved_reply_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/saved-reply/create')) { e.preventDefault(); setTab('saved_reply_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/whatsapp-account'))   { e.preventDefault(); setTab('whatsapp_account'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/subscription/yearly')) { e.preventDefault(); setTab('subscription_yearly'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/subscription/monthly')) { e.preventDefault(); setTab('subscription_monthly'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/subscription/index')) { e.preventDefault(); setTab('subscription_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/profile-setting'))    { e.preventDefault(); setTab('profile_setting'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/development-credential')) { e.preventDefault(); setTab('development_credential'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/ip-white-list/index')) { e.preventDefault(); setTab('ip_white_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/twofactor'))       { e.preventDefault(); setTab('twofactor'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/change-password')) { e.preventDefault(); setTab('change_password'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/contact/list'))           { e.preventDefault(); setTab('contact_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/contact-tag/list'))       { e.preventDefault(); setTab('contact_tag_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/contactlist/list'))       { e.preventDefault(); setTab('contactlist_list'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/automation/welcome-message')) { e.preventDefault(); setTab('automation_welcome_message'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/flow-builder'))           { e.preventDefault(); setTab('flow_builder'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/automation/ai-bot'))      { e.preventDefault(); setTab('automation_ai_bot'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/shortlink/create'))       { e.preventDefault(); setTab('shortlink_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/shortlink/index'))        { e.preventDefault(); setTab('shortlink_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/floater/create'))         { e.preventDefault(); setTab('floater_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/floater/index'))          { e.preventDefault(); setTab('floater_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/cta-url/create'))         { e.preventDefault(); setTab('cta_url_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/cta-url/index'))          { e.preventDefault(); setTab('cta_url_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/interactive-list/create')) { e.preventDefault(); setTab('interactive_list_create'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/interactive-list/index'))  { e.preventDefault(); setTab('interactive_list_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/ecommerce/woo-commerce/products')) { e.preventDefault(); setTab('ecommerce_woocommerce_products'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/ecommerce/woo-commerce/config'))   { e.preventDefault(); setTab('ecommerce_woocommerce_config'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/deposit/history'))        { e.preventDefault(); setTab('deposit_history'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/withdraw/history'))       { e.preventDefault(); setTab('withdraw_history'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/transactions'))           { e.preventDefault(); setTab('transactions'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/whatsapp-pricing'))       { e.preventDefault(); setTab('whatsapp_pricing'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/referral/index'))         { e.preventDefault(); setTab('referral_index'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/help'))                        { e.preventDefault(); setTab('help'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user-guide'))                  { e.preventDefault(); setTab('user_guide'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/agentbunny-assistant'))     { e.preventDefault(); setTab('agentbunny_assistant'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/ticket'))                      { e.preventDefault(); setTab('ticket'); setIsSidebarMobileOpen(false); }
          else if (href.includes('/user/logout')) { e.preventDefault(); onLogout(); }
          else if (href.includes('#') && (anchor.classList.contains('sidebar-menu-list__link') || anchor.closest('.has-dropdown'))) {
            // Let sidebar dropdowns pass through
          } else if (href.startsWith('http') && !href.includes('localhost')) {
            e.preventDefault();
            if (window.notify) window.notify('info', 'This feature is running in demo mode.');
          }
        }
      }
    };

    const handleGlobalChange = (e) => {
      const planRecurringSelect = e.target.closest('#plan_recurring');
      if (planRecurringSelect) {
        const isYearly = planRecurringSelect.value === '2';
        const modal = planRecurringSelect.closest('.modal');
        if (modal) {
          // Update duration text
          const durationSpan = modal.querySelector('.duration');
          if (durationSpan) durationSpan.innerText = isYearly ? 'Yearly' : 'Monthly';
          
          // Get correct plan price dynamically from stored plan data
          const planDataStr = modal.getAttribute('data-active-plan');
          if (planDataStr) {
            try {
              const planData = JSON.parse(planDataStr);
              const priceVal = isYearly ? planData.yearly_price : planData.monthly_price;
              const priceSpan = modal.querySelector('.price');
              if (priceSpan) priceSpan.innerText = `රු${parseFloat(priceVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    };

    const handleFormSubmit = (e) => {
      // Always prevent default FIRST to stop any native form redirect
      const form = e.target.closest ? e.target.closest('form') : e.target;
      if (form && form.classList && (form.classList.contains('purchase-form') || form.action)) {
        e.preventDefault();
      }
      if (form) {
        if (form.id === 'mock-chat-form') return;

        // Bootstrap moves modal to body, so e.target.closest may fail — use document-level query as fallback
        const purchaseForm = e.target.closest('.purchase-form') || document.querySelector('.purchase-form');
        if (purchaseForm) {
          // Ensure form does not redirect natively
          e.preventDefault();
          purchaseForm.removeAttribute('action');
          purchaseForm.removeAttribute('method');
          
          const planIdInput = purchaseForm.querySelector('#pricing_plan_id');
          const planId = planIdInput ? planIdInput.value : '';
          
          const recurringSelect = purchaseForm.querySelector('#plan_recurring');
          const isYearly = recurringSelect ? recurringSelect.value === '2' : false;

          const selectedCardInput = purchaseForm.querySelector('input[name="payment_card_id"]:checked');
          const paymentMethodId = selectedCardInput ? selectedCardInput.value : '';

          // If no saved card is selected, show error — do NOT redirect externally
          if (!paymentMethodId) {
            if (window.notify) window.notify('error', 'Please select a payment card or add a new card first.');
            return;
          }

          // Close the bootstrap purchaseModal if open to clear screen
          const purchaseModalEl = document.getElementById('purchaseModal');
          if (purchaseModalEl) {
            if (window.bootstrap && window.bootstrap.Modal) {
              const bsModal = window.bootstrap.Modal.getInstance(purchaseModalEl);
              if (bsModal) bsModal.hide();
            } else {
              purchaseModalEl.classList.remove('show');
              purchaseModalEl.style.display = 'none';
              document.body.classList.remove('modal-open');
            }
          }

          // Trigger processing state
          setIsPaymentProcessing(true);
          setPaymentResult(null);
          if (paymentMethodId) {
            // Direct charge logic for saved cards
            fetch(`${API_BASE_URL}/payments/charge-saved-card`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
              },
              body: JSON.stringify({ plan: planId, billingCycle: isYearly ? 'Yearly' : 'Monthly', paymentMethodId })
            })
            .then(async (res) => {
              const data = await res.json();
              setTimeout(() => {
                if (res.ok && data.success) {
                  setPaymentResult('success');
                  const savedUser = JSON.parse(localStorage.getItem('aura_user') || '{}');
                  savedUser.plan = data.user.plan;
                  savedUser.status = data.user.status;
                  savedUser.billing_cycle = data.user.billing_cycle;
                  localStorage.setItem('aura_user', JSON.stringify(savedUser));
                  if (setUser) setUser(savedUser);

                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } else if (res.ok && data.requiresAction) {
                  // Card requires 3D Secure / OTP Authentication!
                  if (window.Stripe && stripePublicKey) {
                    const stripe = window.Stripe(stripePublicKey);
                    stripe.confirmCardPayment(data.clientSecret, {
                      payment_method: paymentMethodId
                    }).then(async (result) => {
                      if (result.error) {
                        console.error('3DS error:', result.error.message);
                        if (window.notify) window.notify('error', result.error.message);
                        setPaymentResult('error');
                      } else {
                        // Confirm payment intent on the backend
                        fetch(`${API_BASE_URL}/payments/confirm-payment-intent`, {
                           method: 'POST',
                           headers: {
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
                           },
                           body: JSON.stringify({ paymentIntentId: data.paymentIntentId, plan: planId, billingCycle: isYearly ? 'Yearly' : 'Monthly' })
                        })
                        .then(async (confirmRes) => {
                          const confirmData = await confirmRes.json();
                          if (confirmRes.ok && confirmData.success) {
                            setPaymentResult('success');
                            const savedUser = JSON.parse(localStorage.getItem('aura_user') || '{}');
                            savedUser.plan = confirmData.user.plan;
                            savedUser.status = confirmData.user.status;
                            savedUser.billing_cycle = confirmData.user.billing_cycle;
                            localStorage.setItem('aura_user', JSON.stringify(savedUser));
                            if (setUser) setUser(savedUser);

                            setTimeout(() => {
                              window.location.reload();
                            }, 2000);
                          } else {
                            console.error('Confirm intent error:', confirmData);
                            if (window.notify) window.notify('error', confirmData.error || 'Verification failed.');
                            setPaymentResult('error');
                          }
                        })
                        .catch((err) => {
                          console.error(err);
                          if (window.notify) window.notify('error', err.message || 'Verification network error.');
                          setPaymentResult('error');
                        });
                      }
                    }).catch((err) => {
                      console.error(err);
                      if (window.notify) window.notify('error', err.message || 'Payment confirmation error.');
                      setPaymentResult('error');
                    });
                  } else {
                    console.error('Stripe SDK not loaded or config missing');
                    if (window.notify) window.notify('error', 'Stripe configurations not loaded.');
                    setPaymentResult('error');
                  }
                } else {
                  console.error('Direct charge error:', data);
                  if (window.notify) window.notify('error', data.error || 'Payment declined.');
                  setPaymentResult('error');
                }
              }, 2000);
            })
            .catch(err => {
              console.error(err);
              if (window.notify) window.notify('error', err.message || 'Network error.');
              setTimeout(() => {
                setPaymentResult('error');
              }, 2000);
            });
            return;
          }

          // No saved card was available — show error instead of redirecting to external Stripe
          if (window.notify) window.notify('error', 'No saved card found. Please add a payment card first.');
          setPaymentResult('error');
          return;
        }

        // Only handle form redirect & alert for creation/simulation pages
        const createTabs = [
          'campaign_create', 'customer_create', 'agent_create', 'saved_reply_create',
          'contact_create', 'contact_tag_create', 'contactlist_create', 'shortlink_create',
          'floater_create', 'cta_url_create', 'interactive_list_create', 'template_create',
          'template_create_carousel'
        ];

        if (!createTabs.includes(tab)) {
          // Allow normal forms (like sending chat messages or editing phone) to pass
          return;
        }

        e.preventDefault();
        if (tab === 'campaign_create')          setTab('campaign_index');
        else if (tab === 'customer_create')     setTab('customer_list');
        else if (tab === 'agent_create')        setTab('agent_list');
        else if (tab === 'saved_reply_create')  setTab('saved_reply_index');
        else if (tab === 'contact_create')      setTab('contact_list');
        else if (tab === 'contact_tag_create')  setTab('contact_tag_list');
        else if (tab === 'contactlist_create')  setTab('contactlist_list');
        else if (tab === 'shortlink_create')    setTab('shortlink_index');
        else if (tab === 'floater_create')      setTab('floater_index');
        else if (tab === 'cta_url_create')      setTab('cta_url_index');
        else if (tab === 'interactive_list_create') setTab('interactive_list_index');
        else if (tab === 'template_create')     setTab('template_index');
        else if (tab === 'template_create_carousel') setTab('template_index');
        
        if (window.notify) window.notify('success', 'Operation completed (Demo Mode).');
      }
    };

    // Attach click, change and submit on document to catch Bootstrap modal elements moved to body
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('change', handleGlobalChange, true);
    document.addEventListener('submit', handleFormSubmit, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('change', handleGlobalChange, true);
      document.removeEventListener('submit', handleFormSubmit, true);
    };
  }, [tab, onLogout]);

  // ── 7. Update browser page title dynamically ────────────────────────────
  const isMarketingTool = (tabKey) => {
    const marketingTools = [
      'contact_list', 'contact_tag_list', 'contactlist_list',
      'saved_reply_index', 'saved_reply_create',
      'template_create', 'template_create_carousel', 'template_index',
      'campaign_create', 'campaign_index',
      'automation_welcome_message', 'flow_builder', 'automation_ai_bot',
      'shortlink_create', 'shortlink_index',
      'floater_create', 'floater_index',
      'cta_url_create', 'cta_url_index',
      'interactive_list_create', 'interactive_list_index',
      'ecommerce_woocommerce_products', 'ecommerce_woocommerce_config'
    ];
    return marketingTools.includes(tabKey);
  };

  const getMarketingLockedPage = (tabKey) => {
    const titleMap = {
      contact_list: 'Manage Contacts',
      contact_tag_list: 'Manage Contact Tag',
      contactlist_list: 'Manage Contact List',
      automation_welcome_message: 'Welcome Message',
      flow_builder: 'Flow Builder',
      automation_ai_bot: 'AI Bots',
      shortlink_create: 'Create ShortLink',
      shortlink_index: 'Manage ShortLink',
      floater_create: 'Create Floater',
      floater_index: 'Manage Floater',
      cta_url_create: 'Create URL',
      cta_url_index: 'CTA URL List',
      interactive_list_create: 'Create List',
      interactive_list_index: 'Interactive List',
      ecommerce_woocommerce_products: 'Products',
      ecommerce_woocommerce_config: 'Config',
      saved_reply_index: 'Saved Replies',
      saved_reply_create: 'Create Saved Reply',
      template_create: 'New Template',
      template_create_carousel: 'Carousel Template',
      template_index: 'All Templates',
      campaign_create: 'New Campaign',
      campaign_index: 'All Campaigns'
    };
    const title = titleMap[tabKey] || 'Premium Marketing Tool';
    return {
      title: `AgentBunny - ${title}`,
      body: `
        <div class="dashboard-container d-flex align-items-center justify-content-center" style="min-height: calc(100vh - 180px); background: #f8fafc; padding: 2rem;">
          <div class="text-center p-5 bg-white shadow-sm border border-slate-100" style="border-radius: 24px; max-width: 550px; margin: 40px auto; border: 1px solid #e2e8f0; background: #ffffff;">
            <!-- Icon Wrapper -->
            <div class="d-inline-flex align-items-center justify-content-center mb-4" style="width: 90px; height: 90px; border-radius: 50%; background: #e0f2fe; color: #0284c7; margin-bottom: 24px;">
              <i class="las la-lock" style="font-size: 42px;"></i>
            </div>
            
            <!-- Title -->
            <h3 class="mb-3" style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #1e293b; font-size: 24px; margin-bottom: 12px;">
              Premium Feature Locked
            </h3>
            
            <!-- Tag -->
            <div class="d-inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold" style="background: #f1f5f9; color: #64748b; border-radius: 50px; font-size: 12px; margin-bottom: 20px; display: inline-block;">
              ${title}
            </div>
            
            <!-- Description -->
            <p style="font-size: 15px; color: #64748b; line-height: 1.6; max-width: 440px; margin: 0 auto 24px;">
              Boost your conversions and automate campaigns! This premium marketing tool is currently locked for your account. Please contact our Support Team to activate this feature.
            </p>
            
            <!-- Buttons -->
            <div class="d-flex flex-column gap-2 justify-content-center align-items-center" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
              <a href="/ticket" class="btn btn--base py-3 px-5 d-inline-flex align-items-center gap-2 font-semibold" 
                 data-route="ticket"
                 style="background: #0a938a; border: none; color: #ffffff; border-radius: 12px; font-size: 15px; padding: 12px 32px; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="las la-headset" style="font-size: 18px;"></i> Contact Support Team
              </a>
              <a href="/user/dashboard" class="btn text-slate-400 hover:text-slate-600 font-medium transition-all" 
                 data-route="dashboard"
                 style="color: #94a3b8; font-size: 14px; text-decoration: none; border: none; background: transparent; margin-top: 10px; display: inline-block; cursor: pointer;">
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      `
    };
  };

  const resolvedTab = (tab === 'subscription_monthly' || tab === 'subscription_yearly') ? 'subscription_index' : tab;
  const currentPage = isMarketingTool(resolvedTab) 
    ? getMarketingLockedPage(resolvedTab) 
    : (dashboardPages[resolvedTab] || getMockPage(resolvedTab));
  
  useEffect(() => {
    if (currentPage && currentPage.title) {
      document.title = currentPage.title;
    }
  }, [currentPage]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleDropdown = (key) =>
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));

  const getInitials = (name) => {
    if (!name) return 'CI';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const userName    = user?.name  || 'Cheak Imesh';
  const userEmail   = user?.email || 'i***@gmail.com';
  const userInitials = getInitials(userName);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="dashboard position-relative text-start">
      <ToastContainer />
      
      {/* ── Full Screen Payment Processing Overlay (Dotted Loader + Animated Results) ── */}
      {isPaymentProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          {paymentResult === null ? (
            <>
              {/* Dotted green preloader identical to the site's index.html loader */}
              <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '20px' }}>
                <span className="loader-static" style={{ border: '4px dotted #00832e', borderStyle: 'solid solid dotted dotted', width: '60px', height: '60px' }}></span>
              </div>
              <h4 style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', fontSize: '20px' }}>Securing Transaction...</h4>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Connecting with payment gateway, please wait.</p>
            </>
          ) : paymentResult === 'success' ? (
            <>
              {/* Animated Checkmark icon */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(0, 131, 46, 0.1)',
                color: '#00832e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                marginBottom: '20px'
              }}>
                <i className="las la-check-circle"></i>
              </div>
              <h4 style={{ fontWeight: 700, color: '#00832e', margin: '0 0 8px 0', fontSize: '22px' }}>Payment Approved!</h4>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Your plan has been upgraded successfully. Redirecting...</p>
            </>
          ) : (
            <>
              {/* Animated Cross icon */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                marginBottom: '20px'
              }}>
                <i className="las la-times-circle"></i>
              </div>
              <h4 style={{ fontWeight: 700, color: '#ef4444', margin: '0 0 8px 0', fontSize: '22px' }}>Payment Declined</h4>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>The transaction could not be processed. Please check your card info.</p>
              <button className="btn btn-sm btn-danger" onClick={() => { setIsPaymentProcessing(false); fetchUserTransactions(); }} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
            </>
          )}
        </div>
      )}

      {/* ── Preloader Element visible on state triggers ── */}
      <div className="preloader" style={{ display: isPageLoading ? 'flex' : 'none' }}>
        <span className="loader"></span>
      </div>

      <div className="dashboard__inner flex-wrap">

        {/* Mobile Sidebar Overlay Backdrop */}
        {isSidebarMobileOpen && (
          <div 
            className="custom-sidebar-overlay-unique d-lg-none" 
            onClick={() => setIsSidebarMobileOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 998 // Ensure it sits below zIndex 10005 of sidebar
            }}
          />
        )}

        {/* ── Sidebar ── */}
        <div
          className={`sidebar-menu flex-between ${isSidebarHovered ? '' : 'sidebar-collapsed'} ${isSidebarMobileOpen ? 'show-sidebar' : ''}`}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          style={isSidebarMobileOpen ? {
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            width: '280px',
            height: '100vh',
            zIndex: 10005,
            overflowY: 'auto',
            boxShadow: '0 0 24px rgba(0,0,0,0.2)'
          } : {}}
        >
          <div className="sidebar-menu__inner">
            <span className="sidebar-menu__close d-lg-none d-block" onClick={() => setIsSidebarMobileOpen(false)}>
              <i className="fas fa-times" />
            </span>
            <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '20px 10px', textAlign: 'center' }}>
              <a href="/user/dashboard" className="sidebar-logo__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); setIsSidebarMobileOpen(false); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%' }}>
                <img src="/agentbunny-logo.png" alt="logo" style={{ height: '48px', width: '48px', objectFit: 'contain' }} />
                <span className="brand-text" style={{ fontSize: '15px', fontWeight: '900', color: '#00832e', letterSpacing: '0.5px', textTransform: 'uppercase' }}>AgentBunny</span>
              </a>
            </div>

            <ul className="sidebar-menu-list">
              {/* Dashboard */}
              <li className={`sidebar-menu-list__item ${tab === 'dashboard' ? 'active' : ''}`}>
                <a href="/user/dashboard" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-th-large" /></span>
                  <span className="text">My Dashboard</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">CRM TOOLS</span></li>

              {/* Manage Inbox */}
              <li className={`sidebar-menu-list__item ${tab === 'inbox' ? 'active' : ''}`}>
                <a href="/user/inbox" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('inbox'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-sms" /></span>
                  <span className="text">Manage Inbox</span>
                </a>
              </li>

              {/* Manage Customer */}
              <li className={`sidebar-menu-list__item ${tab === 'customer_list' || tab === 'customer_create' ? 'active' : ''}`}>
                <a href="/user/customer/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('customer_list'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-users" /></span>
                  <span className="text">Manage Customer</span>
                </a>
              </li>

              {/* Manage Orders */}
              <li className={`sidebar-menu-list__item ${tab === 'orders_list' ? 'active' : ''}`}>
                <a href="/user/orders/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('orders_list'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-shopping-basket" /></span>
                  <span className="text">Manage Orders</span>
                </a>
              </li>

              {/* Manage Inventory */}
              <li className={`sidebar-menu-list__item ${tab === 'manage_inventory' ? 'active' : ''}`}>
                <a href="/user/inventory" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('manage_inventory'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-warehouse" /></span>
                  <span className="text">Manage Inventory</span>
                </a>
              </li>

              {/* Track Customer Orders */}
              <li className={`sidebar-menu-list__item ${tab === 'track_orders' ? 'active' : ''}`}>
                <a href="/user/tracking" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('track_orders'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-truck-loading" /></span>
                  <span className="text">Track Customer Orders</span>
                </a>
              </li>

              {/* Manage Agent */}
              <li className={`sidebar-menu-list__item ${tab === 'agent_list' || tab === 'agent_create' ? 'active' : ''}`}>
                <a href="/user/agent/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('agent_list'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-user-cog" /></span>
                  <span className="text">Manage Agent</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">MARKETING TOOLS</span></li>

              {/* Contacts dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['contacts'] || ['contact_list', 'contact_tag_list', 'contactlist_list'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('contacts'); }}>
                  <span className="icon"><i className="las la-id-card" /></span>
                  <span className="text">Manage Contacts</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['contacts'] || ['contact_list', 'contact_tag_list', 'contactlist_list'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'contact_list' ? 'active' : ''}`}><a href="/user/contact/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contact_list'); setIsSidebarMobileOpen(false); }}><span className="text">Manage Contacts</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'contact_tag_list' ? 'active' : ''}`}><a href="/user/contact-tag/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contact_tag_list'); setIsSidebarMobileOpen(false); }}><span className="text">Manage Contact Tag</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'contactlist_list' ? 'active' : ''}`}><a href="/user/contactlist/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contactlist_list'); setIsSidebarMobileOpen(false); }}><span className="text">Manage Contact List</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Saved Replies */}
              <li className={`sidebar-menu-list__item ${tab === 'saved_reply_index' || tab === 'saved_reply_create' ? 'active' : ''}`}>
                <a href="/user/saved-reply/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('saved_reply_index'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-bolt" /></span>
                  <span className="text">Saved Replies</span>
                </a>
              </li>

              {/* Templates dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['templates'] || ['template_create', 'template_create_carousel', 'template_index'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('templates'); }}>
                  <span className="icon"><i className="las la-envelope" /></span>
                  <span className="text">Manage Templates</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['templates'] || ['template_create', 'template_create_carousel', 'template_index'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'template_create' ? 'active' : ''}`}><a href="/user/template/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_create'); setIsSidebarMobileOpen(false); }}><span className="text">New Template</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'template_create_carousel' ? 'active' : ''}`}><a href="/user/template/create/carousel" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_create_carousel'); setIsSidebarMobileOpen(false); }}><span className="text">Carousel Template</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'template_index' ? 'active' : ''}`}><a href="/user/template/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_index'); setIsSidebarMobileOpen(false); }}><span className="text">All Template</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Campaigns dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['campaigns'] || tab.startsWith('campaign_') ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('campaigns'); }}>
                  <span className="icon"><i className="las la-bullhorn" /></span>
                  <span className="text">Manage Campaigns</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['campaigns'] || tab.startsWith('campaign_')) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'campaign_create' ? 'active' : ''}`}>
                      <a href="/user/campaign/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_create'); setIsSidebarMobileOpen(false); }}><span className="text">New Campaign</span></a>
                    </li>
                    <li className={`sidebar-submenu-list__item ${tab === 'campaign_index' ? 'active' : ''}`}>
                      <a href="/user/campaign/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_index'); setIsSidebarMobileOpen(false); }}><span className="text">All Campaign</span></a>
                    </li>
                  </ul>
                </div>
              </li>

              {/* Manage Automation dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['automation'] || ['automation_welcome_message', 'flow_builder', 'automation_ai_bot'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('automation'); }}>
                  <span className="icon"><i className="las la-envelope" /></span>
                  <span className="text">Manage Automation</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['automation'] || ['automation_welcome_message', 'flow_builder', 'automation_ai_bot'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'automation_welcome_message' ? 'active' : ''}`}><a href="/user/automation/welcome-message" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('automation_welcome_message'); setIsSidebarMobileOpen(false); }}><span className="text">Welcome Message</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'flow_builder' ? 'active' : ''}`}><a href="/user/flow-builder" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('flow_builder'); setIsSidebarMobileOpen(false); }}><span className="text">Flow Builder</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'automation_ai_bot' ? 'active' : ''}`}><a href="/user/automation/ai-bot" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('automation_ai_bot'); setIsSidebarMobileOpen(false); }}><span className="text">AI Bots</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage ShortLink dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['shortlink'] || ['shortlink_create', 'shortlink_index'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('shortlink'); }}>
                  <span className="icon"><i className="las la-link" /></span>
                  <span className="text">Manage ShortLink</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['shortlink'] || ['shortlink_create', 'shortlink_index'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'shortlink_create' ? 'active' : ''}`}><a href="/user/shortlink/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('shortlink_create'); setIsSidebarMobileOpen(false); }}><span className="text">Create ShortLink</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'shortlink_index' ? 'active' : ''}`}><a href="/user/shortlink/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('shortlink_index'); setIsSidebarMobileOpen(false); }}><span className="text">Manage ShortLink</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage Floaters dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['floaters'] || ['floater_create', 'floater_index'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('floaters'); }}>
                  <span className="icon"><i className="lab la-whatsapp" /></span>
                  <span className="text">Manage Floaters</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['floaters'] || ['floater_create', 'floater_index'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'floater_create' ? 'active' : ''}`}><a href="/user/floater/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('floater_create'); setIsSidebarMobileOpen(false); }}><span className="text">Create Floater</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'floater_index' ? 'active' : ''}`}><a href="/user/floater/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('floater_index'); setIsSidebarMobileOpen(false); }}><span className="text">Manage Floater</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage CTA URL dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['cta'] || ['cta_url_create', 'cta_url_index'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('cta'); }}>
                  <span className="icon"><i className="las la-paperclip" /></span>
                  <span className="text">Manage CTA URL</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['cta'] || ['cta_url_create', 'cta_url_index'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'cta_url_create' ? 'active' : ''}`}><a href="/user/cta-url/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('cta_url_create'); setIsSidebarMobileOpen(false); }}><span className="text">Create URL</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'cta_url_index' ? 'active' : ''}`}><a href="/user/cta-url/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('cta_url_index'); setIsSidebarMobileOpen(false); }}><span className="text">CTA URl List</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage Interactive List dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['interactive'] || ['interactive_list_create', 'interactive_list_index'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('interactive'); }}>
                  <span className="icon"><i className="las la-list" /></span>
                  <span className="text">Manage Interactive List</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['interactive'] || ['interactive_list_create', 'interactive_list_index'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'interactive_list_create' ? 'active' : ''}`}><a href="/user/interactive-list/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('interactive_list_create'); setIsSidebarMobileOpen(false); }}><span className="text">Create List</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'interactive_list_index' ? 'active' : ''}`}><a href="/user/interactive-list/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('interactive_list_index'); setIsSidebarMobileOpen(false); }}><span className="text">Interactive List</span></a></li>
                  </ul>
                </div>
              </li>

              {/* E-Commerce dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['ecommerce'] || ['ecommerce_woocommerce_products', 'ecommerce_woocommerce_config'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('ecommerce'); }}>
                  <span className="icon"><i className="las la-shopping-cart" /></span>
                  <span className="text">E-Commerce</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['ecommerce'] || ['ecommerce_woocommerce_products', 'ecommerce_woocommerce_config'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item has-dropdown ${openDropdowns['woocommerce'] || ['ecommerce_woocommerce_products', 'ecommerce_woocommerce_config'].includes(tab) ? 'open' : ''}`}>
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('woocommerce'); }}>
                        <span className="text">Woo-Commerce</span>
                      </a>
                      <div className="sidebar-submenu" style={{ display: (openDropdowns['woocommerce'] || ['ecommerce_woocommerce_products', 'ecommerce_woocommerce_config'].includes(tab)) ? 'block' : 'none', paddingLeft: '12px' }}>
                        <ul className="sidebar-submenu-list">
                          <li className={`sidebar-submenu-list__item ${tab === 'ecommerce_woocommerce_products' ? 'active' : ''}`}>
                            <a href="/user/ecommerce/woo-commerce/products" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ecommerce_woocommerce_products'); setIsSidebarMobileOpen(false); }}>
                              <span className="text">Products</span>
                            </a>
                          </li>
                          <li className={`sidebar-submenu-list__item ${tab === 'ecommerce_woocommerce_config' ? 'active' : ''}`}>
                            <a href="/user/ecommerce/woo-commerce/config" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ecommerce_woocommerce_config'); setIsSidebarMobileOpen(false); }}>
                              <span className="text">Config</span>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">FINANCE</span></li>

              {/* Manage Deposit */}
              <li className={`sidebar-menu-list__item ${tab === 'deposit_history' ? 'active' : ''}`}>
                <a href="/user/deposit/history" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('deposit_history'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-money-bill" /></span>
                  <span className="text">Manage Deposit</span>
                </a>
              </li>

              {/* Manage Withdraw */}
              <li className={`sidebar-menu-list__item ${tab === 'withdraw_history' ? 'active' : ''}`}>
                <a href="/user/withdraw/history" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('withdraw_history'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-wallet" /></span>
                  <span className="text">Manage Withdraw</span>
                </a>
              </li>

              {/* Transactions Logs */}
              <li className={`sidebar-menu-list__item ${tab === 'transactions' ? 'active' : ''}`}>
                <a href="/user/transactions" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('transactions'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-exchange-alt" /></span>
                  <span className="text">Transactions Logs</span>
                </a>
              </li>

              {/* WhatsApp Pricing */}
              <li className={`sidebar-menu-list__item ${tab === 'whatsapp_pricing' ? 'active' : ''}`}>
                <a href="/user/whatsapp-pricing" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsapp_pricing'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="lab la-whatsapp" /></span>
                  <span className="text">WhatsApp Pricing</span>
                </a>
              </li>

              {/* Manage Referrals */}
              <li className={`sidebar-menu-list__item ${tab === 'referral_index' ? 'active' : ''}`}>
                <a href="/user/referral/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('referral_index'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-share-alt" /></span>
                  <span className="text">Manage Referrals</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">BILLING &amp; PROFILE</span></li>

              {/* Whatsapp Accounts */}
              <li className={`sidebar-menu-list__item ${tab === 'whatsapp_account' ? 'active' : ''}`}>
                <a href="/user/whatsapp-account" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-phone" /></span>
                  <span className="text">Whatsapp Accounts</span>
                </a>
              </li>

              {/* Business Profile */}
              <li className={`sidebar-menu-list__item ${tab === 'business_profile' ? 'active' : ''}`}>
                <a href="/user/business-profile" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('business_profile'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-store" /></span>
                  <span className="text">Business Profile</span>
                </a>
              </li>

              {/* Subscription Info */}
              <li className={`sidebar-menu-list__item ${['subscription_index', 'subscription_monthly', 'subscription_yearly'].includes(tab) ? 'active' : ''}`}>
                <a href="/user/subscription/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-dollar-sign" /></span>
                  <span className="text">Subscription Info</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">SETTINGS &amp; HELP</span></li>

              {/* Help & Support dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['help'] || ['help', 'user_guide', 'agentbunny_assistant', 'ticket'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('help'); }}>
                  <span className="icon"><i className="las la-life-ring" /></span>
                  <span className="text">Help &amp; Support</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['help'] || ['help', 'user_guide', 'agentbunny_assistant', 'ticket'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'help' ? 'active' : ''}`}><a href="/help" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('help'); setIsSidebarMobileOpen(false); }}><span className="text">Help Center</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'user_guide' ? 'active' : ''}`}><a href="/user-guide" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('user_guide'); setIsSidebarMobileOpen(false); }}><span className="text">User Guide</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'agentbunny_assistant' ? 'active' : ''}`}><a href="/user/agentbunny-assistant" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('agentbunny_assistant'); setIsSidebarMobileOpen(false); }}><span className="text">AgentBunny AI Support</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'ticket' ? 'active' : ''}`}><a href="/ticket" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ticket'); setIsSidebarMobileOpen(false); }}><span className="text">Support Ticket</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage Profile */}
              <li className={`sidebar-menu-list__item ${tab === 'profile_setting' ? 'active' : ''}`}>
                <a href="/user/profile-setting" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); setIsSidebarMobileOpen(false); }}>
                  <span className="icon"><i className="las la-user" /></span>
                  <span className="text">Manage Profile</span>
                </a>
              </li>

              {/* Sign Out */}
              <li className="sidebar-menu-list__item mt-4">
                <a href="#" className="sidebar-menu-list__link text--danger" onClick={(e) => { e.preventDefault(); onLogout(); }}>
                  <span className="icon text--danger"><i className="fa-solid fa-arrow-right-from-bracket" /></span>
                  <span className="text text--danger">Sign Out</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="dashboard__right">
          <div className="container-fluid p-0">

            {/* Header */}
            <div className="dashboard-header dashboard-nav">
              <div className="dashboard-header__inner flex-between">
                <div className="dashboard-header__left">
                  <div className="dashboard-body__bar d-lg-none d-block" onClick={() => setIsSidebarMobileOpen(true)}>
                    <span className="dashboard-body__bar-icon"><i className="fas fa-bars" /></span>
                  </div>
                  <h3 className="title">{currentPage.title ? currentPage.title.replace('AgentBunny - ', '') : 'Dashboard'}</h3>
                </div>

                <div className="dashboard-header__right" style={{ display: 'flex', alignItems: 'center' }}>
                  {/* WhatsApp Active Session Selector Dropdown */}
                  {sessions.length > 0 && (
                    <div className="user-info" style={{ marginRight: '16px', position: 'relative' }}>
                      <div className="user-info__right" onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}>
                        <div className="user-info__button px-3 py-2 md:px-4 md:py-2" style={{ cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                          <span className="icon mr-0 md:mr-2" style={{ color: '#00832e', display: 'flex', alignItems: 'center' }}><i className="fa-brands fa-whatsapp fa-xl"></i></span>
                          <span className="hidden md:inline-block" style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', paddingRight: '4px' }}>
                            {sessions.find(s => s.id === activeSessionId)?.session_name || 'WhatsApp Account'}
                            {sessions.find(s => s.id === activeSessionId)?.phone && ` (${formatPhone(sessions.find(s => s.id === activeSessionId).phone)})`}
                          </span>
                          <i className="fa-solid fa-chevron-down" style={{ fontSize: '10px', marginLeft: '6px', color: '#64748b', transform: isSessionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}></i>
                        </div>
                      </div>

                      {/* Custom Rounded iOS-Style Dropdown Menu */}
                      {isSessionDropdownOpen && (
                        <>
                          <div 
                            onClick={() => setIsSessionDropdownOpen(false)} 
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                          />
                          
                          <div 
                            className="animate-fade-in"
                            style={{ 
                              position: 'absolute', 
                              top: '115%', 
                              right: 0, 
                              minWidth: '240px', 
                              backgroundColor: '#ffffff', 
                              borderRadius: '16px', 
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
                              border: '1px solid #f1f5f9', 
                              padding: '8px', 
                              zIndex: 1000,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Switch Account
                            </div>
                            {sessions.map(s => {
                              const isActive = s.id === activeSessionId;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setActiveSessionId(s.id);
                                    localStorage.setItem('agentbunny_active_session_id', s.id);
                                    setIsSessionDropdownOpen(false);
                                    window.location.reload();
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: 'none',
                                    background: isActive ? '#f1f5f9' : 'transparent',
                                    borderRadius: '10px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                  }}
                                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>{s.session_name}</span>
                                    {s.phone && <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>{formatPhone(s.phone)}</span>}
                                  </div>
                                  {isActive && (
                                    <span style={{ color: '#00832e', display: 'flex', alignItems: 'center' }}>
                                      <i className="fa-solid fa-check text-xs"></i>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="user-info">
                    <div className="user-info__right" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                      <div className="user-info__button" tabIndex="-1">
                        <div className="user-info__thumb"><span>{userInitials}</span></div>
                        <div className="user-info__profile">
                          <p className="user-info__name">{userName}</p>
                          <span className="user-info__desc">
                            {userEmail} <span className="icon"><i className="fa-solid fa-caret-down" /></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <ul className="user-info-dropdown" style={{ display: isProfileOpen ? 'block' : 'none' }}>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/profile-setting" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="far fa-user" /></span><span className="text">View Profile</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/subscription/index" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fa-solid fa-dollar-sign" /></span><span className="text">Subscription Info</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/whatsapp-account" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fa-brands fa-whatsapp" /></span><span className="text">WhatsApp Account</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/development-credential" onClick={(e) => { e.preventDefault(); setTab('development_credential'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fab fa-codepen" /></span><span className="text">Developer Tool</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/ip-white-list/index" onClick={(e) => { e.preventDefault(); setTab('ip_white_list'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fas fa-mobile" /></span><span className="text">IP White List</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/twofactor" onClick={(e) => { e.preventDefault(); setTab('twofactor'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fa-solid fa-shield-halved" /></span><span className="text">2FA Setting</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/change-password" onClick={(e) => { e.preventDefault(); setTab('change_password'); setIsSidebarMobileOpen(false); setIsProfileOpen(false); }}><span className="icon"><i className="fas fa-key" /></span><span className="text">Change Password</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link text--danger" href="#" onClick={(e) => { e.preventDefault(); onLogout(); setIsProfileOpen(false); }}><span className="icon text--danger"><i className="fa-solid fa-arrow-right-from-bracket" /></span><span className="text text--danger">Sign Out</span></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="dashboard-header__shape">
                <img src="https://wpp.raybeamdigital.com/assets/templates/basic/images/ds-1.png" alt="" />
              </div>
            </div>

            {user?.status === 'Frozen' && (
              <div className="animate-fade-in" style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: '600',
                margin: '20px 20px 0 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.05)'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fca5a5', color: '#991b1b', fontSize: '14px', fontWeight: 'bold' }}>!</span>
                <span>Your account is frozen because you have exceeded your plan's AI Response Limit. Please upgrade or renew your plan to restore AI replies.</span>
                <button 
                  onClick={() => setTab('subscription_index')}
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  Upgrade Now
                </button>
              </div>
            )}

            {/* Page content injected from scraped HTML / mockups */}
            <div className="dashboard-body">
              {tab === 'whatsapp_account' ? (
                <WhatsAppAccountManager activeSessionId={activeSessionId} onSessionsUpdated={fetchSessions} user={user} />
              ) : tab === 'manage_inventory' ? (
                <ManageInventory user={user} />
              ) : tab === 'inbox' ? (
                <WhatsAppInbox activeSessionId={activeSessionId} />
              ) : tab === 'orders_list' ? (
                <WhatsAppOrderManager />
              ) : tab === 'automation_ai_bot' ? (
                <WhatsAppAIBotManager user={user} activeSessionId={activeSessionId} />
              ) : tab === 'business_profile' ? (
                <BusinessProfile user={user} />
              ) : tab === 'customer_list' ? (
                <ManageCustomers user={user} />
              ) : tab === 'track_orders' ? (
                <TrackCustomerOrders user={user} />
              ) : tab === 'transactions' ? (
                <UserTransactions userTransactions={userTransactions} />
              ) : (tab === 'subscription_index' || tab === 'subscription_monthly' || tab === 'subscription_yearly') ? (
                <div dangerouslySetInnerHTML={{
                  __html: renderSubscriptionBody()
                    .replace('__TOTAL_EARNED__', (stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_DEPOSITS__', (stats?.total_deposits ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_WITHDRAWALS__', (stats?.total_withdrawals ?? 0).toString())
                    .replace('__TOTAL_CONTACTS__', (stats?.total_contacts ?? 0).toString())
                    .replace('__TOTAL_TAGS__', (stats?.total_tags ?? 0).toString())
                    .replace('__TOTAL_LISTS__', (stats?.total_lists ?? 0).toString())
                    .replace('__TOTAL_AI_MESSAGES__', (user?.ai_message_count ?? 0).toString())
                    .replace('__ACTIVE_FLOWS__', (stats?.active_flows ?? 0).toString())
                    .replace('__AI_BOTS__', (stats?.ai_bots ?? 0).toString())
                    .replace('__CAMPAIGN_SENT__', (stats?.campaign_sent ?? 0).toString())
                    .replace('__CAMPAIGN_FAILED__', (stats?.campaign_failed ?? 0).toString())
                    .replace('__CAMPAIGN_SUCCESS_RATE__', (stats?.campaign_success_rate ?? 0).toString())
                    .replace('__CAMPAIGN_TOTAL__', (stats?.campaign_total ?? 0).toString())
                    .replace('__SAVED_CARDS_LIST__', renderSavedCardsHtml())
                }} />
              ) : (
                <div dangerouslySetInnerHTML={{
                  __html: (currentPage.body || '<h3>Page not found</h3>')
                    .replace('__USER_PLAN__', user?.plan || 'Free')
                    .replace('__TRIAL_BUTTON__', (user?.plan === 'Free' || !user?.plan) ? `
                      <button id="claim-free-trial-btn" class="btn btn-sm" style="
                        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                        color: #ffffff;
                        border: none;
                        font-size: 9.5px;
                        font-weight: 700;
                        padding: 5px 11px;
                        border-radius: 20px;
                        box-shadow: 0 3px 10px rgba(2, 132, 199, 0.2);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        text-transform: uppercase;
                        letter-spacing: 0.6px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        animation: pulseGlow 2s infinite ease-in-out;
                        outline: none;
                        border-style: none;
                        margin: 0;
                      ">
                        <i class="las la-gift" style="margin: 0; padding: 0; line-height: 1; font-size: 13px;"></i> Free Trial
                      </button>
                    ` : '')
                    .replace('__TOTAL_EARNED__', (stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_DEPOSITS__', (stats?.total_deposits ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_WITHDRAWALS__', (stats?.total_withdrawals ?? 0).toString())
                    .replace('__TOTAL_CONTACTS__', (stats?.total_contacts ?? 0).toString())
                    .replace('__TOTAL_TAGS__', (stats?.total_tags ?? 0).toString())
                    .replace('__TOTAL_LISTS__', (stats?.total_lists ?? 0).toString())
                    .replace('__TOTAL_AI_MESSAGES__', (user?.ai_message_count ?? 0).toString())
                    .replace('__ACTIVE_FLOWS__', (stats?.active_flows ?? 0).toString())
                    .replace('__AI_BOTS__', (stats?.ai_bots ?? 0).toString())
                    .replace('__CAMPAIGN_SENT__', (stats?.campaign_sent ?? 0).toString())
                    .replace('__CAMPAIGN_FAILED__', (stats?.campaign_failed ?? 0).toString())
                    .replace('__CAMPAIGN_SUCCESS_RATE__', (stats?.campaign_success_rate ?? 0).toString())
                    .replace('__CAMPAIGN_TOTAL__', (stats?.campaign_total ?? 0).toString())
                    .replace('__SAVED_CARDS_LIST__', renderSavedCardsHtml())
                }} />
              )}
            </div>

          </div>
        </div>

        {isStripeModalOpen && (
          <StripeCardModal
            stripePublicKey={stripePublicKey}
            isScriptLoaded={isStripeScriptLoaded}
            isTrialMode={pendingClaimTrial}
            onClose={() => {
              setIsStripeModalOpen(false);
              setPendingClaimTrial(false);
            }}
            onSaveSuccess={() => {
              setIsStripeModalOpen(false);
              fetchSavedCards();
              if (pendingClaimTrial) {
                setPendingClaimTrial(false);
                handleClaimTrial('Premium');
              }
            }}
            user={user}
          />
        )}

      </div>
    </div>
  );
}

// ── Component: StripeCardModal ───────────────────────────────────────
function StripeCardModal({ stripePublicKey, isScriptLoaded, onClose, onSaveSuccess, user, isTrialMode }) {
  const cardElementRef = useRef(null);
  const [stripeInstance, setStripeInstance] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fallback state for local HTTP environment testing — empty by default
  const [mockCardNumber, setMockCardNumber] = useState('');
  const [mockCardExpiry, setMockCardExpiry] = useState('');
  const [mockCardCvc, setMockCardCvc] = useState('');

  // Detect card brand from first digits
  const getCardBrand = (num) => {
    const n = num.replace(/\s/g, '');
    if (n.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return null;
  };
  const cardBrand = getCardBrand(mockCardNumber);


  // On localhost (HTTP), Stripe live keys block element mounting.
  // Activate mock mode as soon as hostname is local — even before the key has loaded.
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isMockInputMode = isLocalHost || (stripePublicKey?.startsWith('pk_live_') && window.location.protocol === 'http:');

  useEffect(() => {
    if (isMockInputMode) return; // Do not attempt to initialize Stripe elements

    if (isScriptLoaded && window.Stripe && stripePublicKey) {
      const stripe = window.Stripe(stripePublicKey);
      setStripeInstance(stripe);
      const elements = stripe.elements();
      
      const card = elements.create('card', {
        style: {
          base: {
            color: '#1e293b',
            fontFamily: '"Inter", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '15px',
            '::placeholder': {
              color: '#94a3b8'
            }
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444'
          }
        }
      });
      
      card.mount(cardElementRef.current);
      setCardElement(card);

      return () => {
        card.destroy();
      };
    }
  }, [isScriptLoaded, stripePublicKey, isMockInputMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isMockInputMode) {
      if (!mockCardNumber.trim() || !mockCardExpiry.trim() || !mockCardCvc.trim()) {
        setError('Please fill in all credit card inputs.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const cleanNum = mockCardNumber.replace(/\s+/g, '');
        const mockId = 'pm_mock_' + (cleanNum.startsWith('5') ? 'mastercard' : 'visa') + '_' + Math.random().toString(36).substring(2, 10);
        
        const res = await fetch(`${API_BASE_URL}/payments/methods/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
          },
          body: JSON.stringify({ paymentMethodId: mockId })
        });
        const data = await res.json();
        
        if (res.ok) {
          if (window.notify) window.notify('success', 'Credit card successfully saved to your account!');
          onSaveSuccess();
        } else {
          setError(data.error || 'Failed to save card.');
        }
      } catch (err) {
        console.error(err);
        setError('Network error. Failed to save card.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!stripeInstance || !cardElement) return;

    setLoading(true);
    setError('');

    let isFinished = false;
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        setLoading(false);
        setError('Save card request timed out. Please check your internet connection.');
      }
    }, 15000); // 15 seconds timeout

    try {
      // Direct call to Stripe to create a Payment Method
      const { paymentMethod, error: stripeErr } = await stripeInstance.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: user?.full_name || user?.name || 'Imesh Raybeam',
          email: user?.email || '',
        }
      });

      if (stripeErr) {
        isFinished = true;
        clearTimeout(timeoutId);
        setError(stripeErr.message);
        setLoading(false);
        return;
      }

      // Save Payment Method ID to backend
      const res = await fetch(`${API_BASE_URL}/payments/methods/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id })
      });
      const data = await res.json();
      
      isFinished = true;
      clearTimeout(timeoutId);

      if (res.ok) {
        if (window.notify) window.notify('success', 'Credit card successfully saved to your account!');
        onSaveSuccess();
      } else {
        setError(data.error || 'Failed to save card.');
      }
    } catch (err) {
      isFinished = true;
      clearTimeout(timeoutId);
      console.error(err);
      setError('Network error. Failed to save card.');
    } finally {
      if (isFinished) {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: 'min(100% - 32px, 480px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
            {isTrialMode ? 'Claim Free Trial Subscription' : 'Add Credit / Debit Card'}
          </h5>
          <button type="button" onClick={onClose} style={{
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '20px',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="las la-times"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', margin: 0 }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Card Details</label>
            {isMockInputMode ? (
              <div className="stripe-mock-container">
                {/* Dynamic brand icon */}
                {cardBrand === 'visa' ? (
                  <span style={{ marginRight: '10px', flexShrink: 0, fontWeight: 900, fontSize: '13px', color: '#1a1f71', letterSpacing: '-0.5px', fontStyle: 'italic', lineHeight: 1 }}>VISA</span>
                ) : cardBrand === 'mastercard' ? (
                  <span style={{ marginRight: '10px', flexShrink: 0, display: 'flex', gap: '0' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#EB001B', display: 'inline-block' }}></span>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#F79E1B', display: 'inline-block', marginLeft: '-5px' }}></span>
                  </span>
                ) : (
                  <i className="las la-credit-card" style={{ color: '#94a3b8', fontSize: '20px', marginRight: '10px', flexShrink: 0 }}></i>
                )}
                {/* Card Number */}
                <input
                  type="text"
                  placeholder="Card number"
                  name="cardnumber"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  value={mockCardNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const val = raw.replace(/(.{4})/g, '$1 ').trim();
                    if (raw.length <= 16) setMockCardNumber(val);
                  }}
                  maxLength={19}
                  required
                  className="stripe-mock-field"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    letterSpacing: '1.5px',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0,
                    height: 'auto',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}
                />
                {/* Separator */}
                <span className="stripe-mock-sep"></span>
                {/* Expiry */}
                <input
                  type="text"
                  placeholder="MM/YY"
                  name="cc-exp"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  value={mockCardExpiry}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 2) setMockCardExpiry(val);
                    else setMockCardExpiry(val.substring(0, 2) + '/' + val.substring(2, 4));
                  }}
                  maxLength={5}
                  required
                  className="stripe-mock-field"
                  style={{
                    width: '70px',
                    flexShrink: 0,
                    textAlign: 'center',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0,
                    height: 'auto',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}
                />
                {/* Separator */}
                <span className="stripe-mock-sep"></span>
                {/* CVC */}
                <input
                  type="text"
                  placeholder="CVC"
                  name="cvc"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  value={mockCardCvc}
                  onChange={(e) => setMockCardCvc(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  required
                  className="stripe-mock-field"
                  style={{
                    width: '55px',
                    flexShrink: 0,
                    textAlign: 'center',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0,
                    height: 'auto',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}
                />
              </div>
            ) : (
              <div style={{
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '12px 16px',
                background: '#f8fafc',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div ref={cardElementRef} />
              </div>
            )}
            
            <small style={{ display: 'block', marginTop: '8px', color: '#64748b', fontSize: '11px' }}>
              Your card information is processed securely by Stripe. We do not store your full card number on our servers.
            </small>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="las la-exclamation-circle" style={{ fontSize: '16px' }}></i>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#00832e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {loading ? (
                <>
                  <i className="las la-spinner la-spin"></i> {isTrialMode ? 'Claiming...' : 'Saving...'}
                </>
              ) : (
                isTrialMode ? 'Claim Now' : 'Save Card'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Component: BusinessProfile (CRM tab) ─────────────────────────────
function BusinessProfile() {
  const [profile, setProfile] = useState({
    business_name: '',
    description: '',
    address: '',
    sizes_info: '',
    bank_details: '',
    logo_url: null,
    photo_urls: []
  });
  const [logoFile, setLogoFile] = useState(null);
  const [addMoreText, setAddMoreText] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [deletedPhotos, setDeletedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/business-profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('business_name', profile.business_name || '');
      
      let finalDescription = profile.description || '';
      if (addMoreText.trim()) {
        finalDescription = finalDescription.trim() ? finalDescription.trim() + '\n' + addMoreText.trim() : addMoreText.trim();
      }
      formData.append('description', finalDescription);
      
      formData.append('address', profile.address || '');
      formData.append('sizes_info', profile.sizes_info || '');
      formData.append('bank_details', profile.bank_details || '');
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      for (const file of photoFiles) {
        formData.append('photos', file);
      }
      if (deletedPhotos.length > 0) {
        formData.append('deleted_photos', JSON.stringify(deletedPhotos));
      }

      const res = await fetch(`${API_BASE_URL}/business-profile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setLogoFile(null);
        setPhotoFiles([]);
        setDeletedPhotos([]);
        setAddMoreText('');
        setStatus({ type: 'success', message: 'Profile updated successfully!' });
      } else {
        const err = await res.json();
        setStatus({ type: 'error', message: err.error || 'Failed to update profile.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Business Profile...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>Business Profile & AI Knowledge Base</h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Upload your brand details, logo, and sizing chart photos. The AI model reads this data to reply to customer questions accurately.
        </p>

        {status.message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: status.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Business Name</label>
            <input
              type="text"
              value={profile.business_name || ''}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px' }}
              placeholder="e.g. Elegant Fashion Store"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>About / Description (Instructs the AI's Tone & Identity)</label>
            <textarea
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px', height: '100px', resize: 'vertical' }}
              placeholder="Describe your brand products, specialties, store policies, etc."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="las la-plus-circle" style={{ fontSize: '18px' }}></i> Add More Details (Quick Append Helper)
            </label>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Type new business rules, details or catalog changes here. Saving will automatically append it to the main About/Description text box above.</p>
            <textarea
              value={addMoreText}
              onChange={(e) => setAddMoreText(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '13px', height: '60px', resize: 'vertical', backgroundColor: '#ffffff' }}
              placeholder="e.g. Added details about islandwide courier tracking rules."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Physical Store / Shipping Address</label>
            <input
              type="text"
              value={profile.address || ''}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px' }}
              placeholder="e.g. No. 12, Colombo Rd, Galle"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Sizes Info & Stock Dimensions (Sizing specifications)</label>
            <textarea
              value={profile.sizes_info || ''}
              onChange={(e) => setProfile({ ...profile, sizes_info: e.target.value })}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px', height: '100px', resize: 'vertical' }}
              placeholder="e.g. S size fits waist 28-30. M fits 31-33. Length is 42 inches for all sizes."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Bank Details (For Bank Transfer payment option)</label>
            <textarea
              value={profile.bank_details || ''}
              onChange={(e) => setProfile({ ...profile, bank_details: e.target.value })}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px', height: '100px', resize: 'vertical' }}
              placeholder="e.g. Bank: HNB, Account Name: Elegant Stores, Account Number: 1234567890, Branch: Colombo"
            />
          </div>

          {/* Logo Upload */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '12px' }}>Brand Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : profile.logo_url ? (
                  <img src={`${API_BASE_URL.replace('/api', '')}${profile.logo_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <i className="las la-store" style={{ fontSize: '32px', color: '#94a3b8' }} />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Sizing Charts / Product Photos Upload */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '4px' }}>Knowledge Base Photos (Size charts, item maps)</label>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Upload up to 10 sizing/product photos. AI bot refers to these images to assist customers.</p>
            
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
              style={{ fontSize: '13px', marginBottom: '16px', display: 'block' }}
            />

            {/* List current photos */}
            {profile.photo_urls && profile.photo_urls.length > 0 && (
              <div style={{ display: 'flex', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {profile.photo_urls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                    <img src={`${API_BASE_URL.replace('/api', '')}${url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setDeletedPhotos([...deletedPhotos, url]);
                        setProfile({ ...profile, photo_urls: profile.photo_urls.filter(u => u !== url) });
                      }}
                      style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', textAlign: 'right' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving Profile...' : 'Save Knowledge Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Component: ManageCustomers (CRM tab) ─────────────────────────────
// ── Component: ManageCustomers (CRM tab) ─────────────────────────────
function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState('All');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/crm/customers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (filterLabel !== 'All') {
      const isConfirmed = c.label === 'Confirmed';
      if (filterLabel === 'Confirmed' && !isConfirmed) return false;
      if (filterLabel === 'Interested' && isConfirmed) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (c.sender_name || '').toLowerCase().includes(q);
      const matchPhone = (c.sender_phone || '').toLowerCase().includes(q);
      return matchName || matchPhone;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="p-8 text-center">
          <i className="las la-spinner la-spin text-[#00832e]" style={{ fontSize: '32px' }}></i>
          <p className="mt-2 text-sm text-gray-500">Loading customers list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-top flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="container-top__left">
          <h5 className="container-top__title">All Customer</h5>
          <p className="container-top__desc">Organize and manage your customer list and status labels with effortless ease.</p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {['All', 'Confirmed', 'Interested'].map(label => (
            <button 
              key={label}
              type="button"
              onClick={() => setFilterLabel(label)} 
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                filterLabel === label 
                  ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                  : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden mt-4">
        
        {/* Search header */}
        <div className="p-4 border-b border-gray-100 bg-[#f8fafc]/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h6 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0">
            Total Customers ({filteredCustomers.length})
          </h6>
          <div className="relative w-full sm:w-64">
            <input 
              type="search" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00832e] transition-colors bg-white/70" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message mx-auto" alt="No data" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
              <span className="d-block mt-2 font-bold text-neutral-700 text-sm">No data found</span>
              <span className="d-block fs-13 text-muted text-xs mt-1">There are no available data to display on this table at the moment.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs" style={{ minWidth: '950px' }}>
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-4 min-w-[200px]">Customer Name</th>
                  <th className="p-4 min-w-[150px]">Phone Number</th>
                  <th className="p-4 min-w-[130px] text-center">Status Label</th>
                  <th className="p-4 min-w-[300px]">Last Message</th>
                  <th className="p-4 min-w-[170px]">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.profile_pic_url || 'https://wpp.raybeamdigital.com/assets/images/avatar.png'}
                          className="w-9 h-9 rounded-full object-cover border border-gray-100"
                          onError={(e) => { e.target.src = 'https://wpp.raybeamdigital.com/assets/images/avatar.png'; }}
                        />
                        <span className="font-bold text-neutral-800">{c.sender_name || 'Customer'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-neutral-800 font-mono whitespace-nowrap">
                      {c.sender_phone}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        c.label === 'Confirmed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {c.label || 'Interested'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 truncate max-w-[300px]" title={c.last_message}>
                      {c.last_message || '—'}
                    </td>
                    <td className="p-4 text-gray-500 font-mono whitespace-nowrap">
                      {new Date(c.updated_at).toLocaleDateString()} {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component: TrackCustomerOrders (CRM tab) ─────────────────────────
function TrackCustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courierName, setCourierName] = useState('SL Post');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('Out for Delivery');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourier, setFilterCourier] = useState('All');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const COURIER_LOGOS = {
    'SL Post': '/sri-lanka-post-logo.png',
    'Citypak': '/citypak-logo.png',
    'Aramex': '/aramex-logo.png',
    'DHL Express': 'https://th.bing.com/th?q=DHL+Logo+Icon+PNG&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-SG&cc=SG&setlang=en&adlt=strict&t=1&mw=247',
    'FedEx': 'https://th.bing.com/th/id/OIP.vuc88Kmi3r_f8yGuQPHVGgHaHa?w=169&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
    'Pronto': 'https://th.bing.com/th/id/OIP.U13AT8WXkPdZRaq4MD_ofwHaHa?w=176&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
    'Domex': '/domex-logo.png',
    'Koombiyo': '/koombiyo-logo.png',
  };

  const FALLBACK_TRUCK = 'https://cdn-icons-png.flaticon.com/512/726/726458.png';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/crm/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (data.length > 0) {
          setSelectedOrder(data[0]);
          setCourierName(data[0].courier_name || 'SL Post');
          setTrackingNumber(data[0].tracking_number || '');
          setTrackingStatus(data[0].tracking_status || 'Out for Delivery');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTracking = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/crm/orders/${selectedOrder.id}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({
          courier_name: courierName,
          tracking_number: trackingNumber,
          tracking_status: trackingStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updated = orders.map(o => o.id === selectedOrder.id ? { 
          ...o, 
          courier_name: courierName, 
          tracking_number: trackingNumber, 
          tracking_status: trackingStatus,
          tracking_history: data.tracking_history 
        } : o);
        setOrders(updated);
        const orderMatch = updated.find(o => o.id === selectedOrder.id);
        setSelectedOrder(orderMatch);
        if (window.notify) window.notify('success', 'Courier Tracking details linked successfully!');
      } else {
        if (window.notify) window.notify('error', 'Failed to update tracking details.');
      }
    } catch (err) {
      if (window.notify) window.notify('error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setCourierName(order.courier_name || 'SL Post');
    setTrackingNumber(order.tracking_number || '');
    setTrackingStatus(order.tracking_status || 'Out for Delivery');
  };

  const getCourierLogoUrl = (name) => {
    const norm = (name || '').toLowerCase();
    if (norm.includes('domex')) return '/domex-logo.png';
    if (norm.includes('koombiyo')) return '/koombiyo-logo.png';
    if (norm.includes('sri lanka post')) return '/sri-lanka-post-logo.png';
    if (norm.includes('citypak')) return '/citypak-logo.png';
    if (norm.includes('aramex')) return '/aramex-logo.png';
    return COURIER_LOGOS[name] || null;
  };

  const filteredOrders = orders.filter(o => {
    // 1. Filter by Courier selection
    if (filterCourier !== 'All') {
      const dbName = (o.courier_name || '').toLowerCase();
      const filterName = filterCourier.toLowerCase();
      if (filterName.includes('domex')) {
        if (!dbName.includes('domex')) return false;
      } else if (filterName.includes('koombiyo')) {
        if (!dbName.includes('koombiyo')) return false;
      } else if (filterName.includes('sri lanka post')) {
        if (!dbName.includes('sri lanka post')) return false;
      } else if (filterName.includes('citypak')) {
        if (!dbName.includes('citypak')) return false;
      } else if (filterName.includes('aramex')) {
        if (!dbName.includes('aramex')) return false;
      } else {
        if (o.courier_name !== filterCourier) return false;
      }
    }
    // 2. Filter by search query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.id.toLowerCase().includes(query) ||
      (o.shipping_details?.name && o.shipping_details.name.toLowerCase().includes(query)) ||
      (o.tracking_number && o.tracking_number.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="p-8 text-center">
          <i className="las la-spinner la-spin text-[#00832e]" style={{ fontSize: '32px' }}></i>
          <p className="mt-2 text-sm text-gray-500">Loading tracking workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. Header & Live Search Bar */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '24px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Courier Integrations & Customer Order Tracker</h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Search and trace packages across active logistics providers.</p>
        </div>

        {/* Courier selector in the middle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Filter Courier:</span>
          <select
            value={filterCourier}
            onChange={(e) => setFilterCourier(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              fontSize: '12px', 
              backgroundColor: '#ffffff',
              fontWeight: '600',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Logistics Providers</option>
            {Object.keys(COURIER_LOGOS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search Order ID, Name, Track #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              padding: '8px 16px 8px 36px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '24px', 
              fontSize: '12px', 
              width: '100%',
              backgroundColor: '#f8fafc'
            }}
          />
          <i className="las la-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
        </div>
      </div>

      {/* Courier Badges with Real Logos */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        overflowX: 'auto', 
        paddingBottom: '16px', 
        marginBottom: '24px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <button
          onClick={() => setFilterCourier('All')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 18px',
            borderRadius: '14px',
            border: filterCourier === 'All' ? '2px solid #00832e' : '1px solid #e2e8f0',
            backgroundColor: filterCourier === 'All' ? '#f0fdf4' : '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            color: filterCourier === 'All' ? '#166534' : '#475569',
            transition: 'all 0.2s',
            boxShadow: filterCourier === 'All' ? '0 4px 6px -1px rgba(0,131,46,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
            minWidth: '72px'
          }}
        >
          <i className="las la-globe" style={{ fontSize: '36px', lineHeight: 1 }}></i>
          <span style={{ whiteSpace: 'nowrap' }}>All Couriers</span>
        </button>

        {Object.entries(COURIER_LOGOS).map(([name, logo]) => {
          const isActive = filterCourier === name;
          return (
            <button
              key={name}
              onClick={() => setFilterCourier(name)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                borderRadius: '14px',
                border: isActive ? '2px solid #00832e' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                color: isActive ? '#166534' : '#475569',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 6px -1px rgba(0,131,46,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                minWidth: '72px'
              }}
            >
              <img 
                src={logo} 
                alt={name} 
                style={{ 
                  width: name === 'Aramex' ? '70px' : name === 'SL Post' ? '75px' : name === 'FedEx' ? '65px' : '40px', 
                  height: '40px', 
                  objectFit: 'contain', 
                  borderRadius: '6px'
                }} 
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>{name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Main 2-Column workspace */}
      <div className="responsive-tracking-grid" style={{ gap: '24px', alignItems: 'start' }}>
        
        {/* Left side: Orders Selector list */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Shipments Register</h4>
          
          {filteredOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="las la-truck-loading" style={{ fontSize: '48px', marginBottom: '8px', display: 'block' }}></i>
              No matching orders found.
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>
                    <th style={{ padding: '12px' }}>Order ID</th>
                    <th style={{ padding: '12px' }}>Recipient Name</th>
                    <th style={{ padding: '12px' }}>Logistics Service</th>
                    <th style={{ padding: '12px' }}>Tracking Number</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr 
                      key={o.id} 
                      onClick={() => selectOrder(o)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        backgroundColor: selectedOrder?.id === o.id ? '#f8fafc' : 'transparent',
                        fontWeight: selectedOrder?.id === o.id ? '600' : 'normal'
                      }}
                    >
                      <td style={{ padding: '14px 12px', color: '#0f172a' }}>{o.id}</td>
                      <td style={{ padding: '14px 12px', color: '#475569' }}>{o.shipping_details?.name}</td>
                      <td style={{ padding: '14px 12px', color: '#475569' }}>
                        {o.courier_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <img 
                              src={getCourierLogoUrl(o.courier_name)} 
                              alt={o.courier_name} 
                              style={{ width: '18px', height: '18px', objectFit: 'contain' }} 
                              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
                            />
                            {o.courier_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 12px', fontFamily: 'monospace', color: '#475569' }}>{o.tracking_number || '—'}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: o.tracking_status === 'Delivered' ? '#dcfce7' : '#e0f2fe',
                          color: o.tracking_status === 'Delivered' ? '#15803d' : '#0369a1'
                        }}>
                          {o.tracking_status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right side: Tracing Timeline and Link form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Live Timeline Tracing (PROMINENT - TOP OF RIGHT SIDEBAR) */}
          {selectedOrder && selectedOrder.tracking_number ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={getCourierLogoUrl(selectedOrder.courier_name)} 
                    alt={selectedOrder.courier_name} 
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
                  />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Package Tracing Log</h4>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{selectedOrder.courier_name} — <strong>{selectedOrder.tracking_number}</strong></span>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: '#00832e',
                  color: '#ffffff'
                }}>
                  {selectedOrder.tracking_status}
                </span>
              </div>

              {/* Progress steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #e2e8f0', marginLeft: '8px' }}>
                {selectedOrder.tracking_history && selectedOrder.tracking_history.map((log, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-29px',
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: idx === selectedOrder.tracking_history.length - 1 ? '#00832e' : '#cbd5e1',
                      border: '3px solid #ffffff',
                      boxShadow: '0 0 0 2px ' + (idx === selectedOrder.tracking_history.length - 1 ? '#00832e' : '#e2e8f0')
                    }}></div>

                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{log.status}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '1px' }}>{log.details}</div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                      <span><i className="las la-map-marker"></i> {log.location}</span>
                      <span><i className="las la-clock"></i> {new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
              <i className="las la-map-marked-alt" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}></i>
              No active tracking logs. Link details below to initiate tracing simulator.
            </div>
          )}

          {/* Section 2: Form to Link Details */}
          {selectedOrder && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <img 
                  src={getCourierLogoUrl(courierName)} 
                  alt={courierName} 
                  style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
                  onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
                />
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Link Logistics Details</h4>
              </div>
              
              <form onSubmit={handleLinkTracking} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Target Order ID: <strong>{selectedOrder.id}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Select Logistics Service</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', width: '100%', backgroundColor: '#ffffff' }}
                  >
                    {Object.keys(COURIER_LOGOS).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Courier Tracking Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. SLP8592039201"
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', width: '100%' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Current Tracking Status</label>
                  <select
                    value={trackingStatus}
                    onChange={(e) => setTrackingStatus(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', width: '100%', backgroundColor: '#ffffff' }}
                  >
                    <option value="Sorting Hub">Sorting Hub</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    width: '100%',
                    marginTop: '6px'
                  }}
                >
                  {updating ? 'Linking Tracking...' : 'Link & Generate History'}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default Dashboard;



import React, { useState, useEffect, useRef } from 'react';
import dashboardPages from '../data/dashboardPages.json';
import { API_BASE_URL } from '../config';


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
    '/user/agent/list': 'agent_list',
    '/user/agent/create': 'agent_create',
    '/user/saved-reply/index': 'saved_reply_index',
    '/user/saved-reply/create': 'saved_reply_create',
    '/user/whatsapp-account': 'whatsapp_account',
    '/user/subscription/index': 'subscription_index',
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
    '/user/whatsray-assistant': 'whatsray_assistant',
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
    agent_list: '/user/agent/list',
    agent_create: '/user/agent/create',
    saved_reply_index: '/user/saved-reply/index',
    saved_reply_create: '/user/saved-reply/create',
    whatsapp_account: '/user/whatsapp-account',
    subscription_index: '/user/subscription/index',
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
    whatsray_assistant: '/user/whatsray-assistant',
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
    whatsray_assistant: 'WhatsRay AI Support',
    ticket: 'Support Tickets'
  };

  const title = titleMap[tabKey] || 'Demo Page';

  if (tabKey === 'whatsray_assistant') {
    return {
      title: `WhatsRay - ${title}`,
      body: `
        <div class="dashboard-container">
          <div class="container-top">
            <div class="container-top__left">
              <h5 class="container-top__title">WhatsRay AI Support</h5>
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
                    <p class="mb-0 fs-14">Hello! I am your WhatsRay AI Assistant. How can I help you automate your WhatsApp Business workflow today?</p>
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
      title: `WhatsRay - ${title}`,
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
    title: `WhatsRay - ${title}`,
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
      alert(err.message);
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
          alert('WhatsApp Session connected successfully! 🎉');
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
      alert(`Limit Reached: You have reached the maximum number of WhatsApp sessions (${maxSessions}) allowed for your ${plan} plan. Upgrade your plan to link more accounts.`);
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
      alert(err.message);
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
                                localStorage.setItem('whatsray_active_session_id', s.id);
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                        className="btn btn-sm btn-shadow bg-black text-white hover:bg-neutral-800 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
                        style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
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
                      <div className="font-mono text-3xl font-black text-neutral-900 bg-white border border-gray-200 py-4 px-6 rounded-2xl inline-block tracking-widest shadow-inner" style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', background: '#fff', border: '1px solid #e2e8f0', padding: '16px 24px', borderRadius: '16px', display: 'inline-block', letterSpacing: '4px' }}>
                        {pairingCode}
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
      alert('Simulated message sent! Processing AI response...');
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
      const chatLabel = c.label || 'None';
      if (chatLabel.toLowerCase() !== labelFilter.toLowerCase()) return false;
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
      <div className="container-top flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="container-top__left">
          <h5 className="container-top__title">Conversations Inbox</h5>
          <p className="container-top__desc">Interact with clients and monitor AI assistant logs in real-time.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button 
            type="button"
            onClick={() => setLabelFilter('All')} 
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              labelFilter === 'All' 
                ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
            }`}
          >
            All
          </button>
          <button 
            type="button"
            onClick={() => setLabelFilter('Confirmed')} 
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
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
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              labelFilter === 'Cancelled' 
                ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
            }`}
          >
            Cancelled
          </button>
          <button 
            type="button"
            onClick={() => setLabelFilter('Interested')} 
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              labelFilter === 'Interested' 
                ? 'bg-[#00832e] text-white shadow-sm font-bold' 
                : 'bg-[#f1f5f9] text-[#4a5d6e] hover:bg-[#e2e8f0]'
            }`}
          >
            Interested
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4" style={{ height: '620px' }}>
        
        {/* Left Side: Chats list */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-[#f8fafc]/50">
            <h6 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Active Chats ({filteredChats.length})</h6>
            <div className="relative">
              <input 
                type="search" 
                placeholder="Search chats..." 
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-100 rounded-xl focus:outline-none focus:border-[#00832e] transition-colors" 
              />
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
                  onClick={() => setActiveChatId(c.id)}
                  className={`p-4 cursor-pointer flex gap-3 transition-colors ${c.id === activeChatId ? 'bg-emerald-50/50 border-r-4 border-[#00832e]' : 'hover:bg-neutral-50'}`}
                >
                  {/* Avatar: profile photo if available, else initials */}
                  {c.profile_pic_url ? (
                    <img 
                      src={c.profile_pic_url} 
                      alt={c.sender_name || 'Contact'}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-10 h-10 rounded-full bg-[#00832e]/10 text-[#00832e] items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ display: c.profile_pic_url ? 'none' : 'flex' }}
                  >
                    {c.sender_name ? c.sender_name.substring(0, 2).toUpperCase() : 'WA'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <h6 className="text-xs font-bold text-neutral-800 truncate mb-0">{c.sender_name || formatPhone(c.sender_phone)}</h6>
                        {c.label && c.label !== 'None' && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 ${
                            c.label === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            c.label === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {c.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* Phone number removed from list view — editable in chat header */}
                    <p className="text-[11px] text-gray-500 truncate mb-0">{c.last_message}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#00832e] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Test message simulator */}
          <div className="p-4 border-t border-gray-100 bg-[#f8fafc]/50">
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
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-[#f8fafc]/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {/* Profile photo in chat header */}
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
                  <div>
                    <h6 className="text-xs font-bold text-neutral-800">{activeChat.sender_name || formatPhone(activeChat.sender_phone)}</h6>
                    {/* Phone number below name in header — inline editable */}
                    <div className="flex items-center gap-1 mb-0.5">
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
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> AI Active Autoreply
                    </span>
                  </div>
                </div>

                {/* Curved Status Buttons */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status:</span>
                  <div className="flex gap-1.5 flex-wrap">
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
                      <p className="mb-1">{m.text}</p>
                      <div className={`text-[9px] ${isAgent ? 'text-emerald-100' : 'text-gray-400'} text-right font-light`}>
                        {m.sender === 'bot' && <span className="font-bold me-1 uppercase">[AI Bot]</span>}
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
    </div>
  );
}

function WhatsAppOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [logoUrl, setLogoUrl] = useState('');

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
    const itemsText = (Array.isArray(order.items) ? order.items : []).map(i => `${i.productName || i.product || 'Item'} x${i.quantity || 1}`).join(', ');
    
    const details = `Order ID: ${order.id}\nRecipient: ${ship.fullName || order.user_name || 'Customer'}\nPhone: ${ship.phone || ''}\nAddress: ${ship.address || ''}, ${ship.city || ''}\nPayment Method: ${ship.payment_method || 'COD'}\nItems: ${itemsText}\nTotal Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}`;
    navigator.clipboard.writeText(details);
    alert('Copied to clipboard!');
  };

  const printReceipt = (order) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    const items = Array.isArray(order.items) ? order.items : [];
    const ship = order.shipping_details || {};
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed #cccccc;">${item.productName || item.product || 'Product'}</td>
        <td style="padding: 8px 0; text-align: center; border-bottom: 1px dashed #cccccc;">${item.quantity || 1}</td>
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
              <strong>Order ID:</strong> ${order.id}<br>
              <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
              <hr style="border: 0; border-top: 1px dashed #000000; margin: 10px 0;">
              <strong>Recipient:</strong> ${ship.fullName || order.user_name || 'WhatsApp Customer'}<br>
              <strong>Phone:</strong> ${ship.phone || ''}<br>
              <strong>Address:</strong> ${ship.address || ''}, ${ship.city || ''}<br>
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Shipping Info</th>
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
                      <td className="p-4 font-mono font-bold text-[#00832e]">
                        #{o.id}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-800">{ship.fullName || o.user_name || 'Guest'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{ship.email || o.user_email}</div>
                      </td>
                      <td className="p-4 max-w-[240px]">
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="text-gray-600">
                              <span className="font-bold text-neutral-700">{item.productName || item.product || 'Product'}</span> 
                              {item.selectedSize && <span className="mx-1 text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">Size: {item.selectedSize}</span>}
                              {item.selectedColor && <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">Color: {item.selectedColor}</span>}
                              <span className="font-mono text-[#00832e] ml-1 font-bold">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-neutral-800">
                        Rs. {parseFloat(o.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-700">{ship.address}</div>
                        <div className="font-medium text-neutral-800">{ship.city} {ship.postalCode && `(${ship.postalCode})`}</div>
                      </td>
                      <td className="p-4 text-gray-500 font-mono">
                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
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
    </div>
  );
}


function Dashboard({ user, onLogout }) {
  // Initialize tab state dynamically based on the browser's current URL path
  const [tab, setTabState] = useState(() => getTabFromPath(window.location.pathname));

  const setTab = (newTab) => {
    const newPath = getPathFromTab(newTab);
    window.location.href = newPath;
  };

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('whatsray_active_session_id') || '');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const [stats, setStats] = useState({
    total_earned: 0,
    total_contacts: 0,
    total_tags: 0,
    total_lists: 0,
    active_flows: 0,
    ai_bots: 0,
    total_deposits: 0,
    total_withdrawals: 0
  });

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
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
            localStorage.setItem('whatsray_active_session_id', data[0].id);
          }
        } else {
          setActiveSessionId('');
          localStorage.removeItem('whatsray_active_session_id');
        }
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
    }
  }, [user]);
  
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

  // ── 1. Load WhatsRay CSS & JS assets once on mount ──────────────────────
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
      // Sidebar hover
      '.dashboard .sidebar-menu:hover{width:280px!important;}',
      '.dashboard .sidebar-menu:hover .sidebar-menu-list__link .text{display:inline-block!important;opacity:1!important;visibility:visible!important;}',
      '.dashboard .sidebar-menu:hover .sidebar-menu-list__title{display:block!important;}',
      '.dashboard .sidebar-logo img{max-height: 40px;object-fit: contain;}',
      '.dashboard .sidebar-menu:hover .sidebar-logo img{display:block!important;}',
      '.dashboard .sidebar-menu:hover .sidebar-logo__link::after{display:none!important;}',
      '.dashboard .sidebar-menu:hover .sidebar-menu-list__item.has-dropdown>.sidebar-menu-list__link::after{display:block!important;}',
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
      '@media(max-width:575px){.whatsapp-empty-screen{min-height:calc(100vh - 110px);padding:22px 14px}.whatsapp-empty-screen__art{min-height:320px;transform:scale(.84)}.whatsapp-empty-screen__robot{width:220px;height:260px}}',
      '.whatsapp-pin-toggle{position:absolute;top:50%;right:12px;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:#667085;display:inline-flex;align-items:center;justify-content:center;font-size:18px;}',
      '.whatsapp-pin-toggle:hover,.whatsapp-pin-toggle:focus{background:rgba(15,118,110,.08);color:#0f766e;outline:none;}',
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
          if (href.includes('/user/dashboard'))            { e.preventDefault(); setTab('dashboard'); }
          else if (href.includes('/user/inbox'))           { e.preventDefault(); setTab('inbox'); }
          else if (href.includes('/user/template/create/carousel')) { e.preventDefault(); setTab('template_create_carousel'); }
          else if (href.includes('/user/template/create'))          { e.preventDefault(); setTab('template_create'); }
          else if (href.includes('/user/template/index'))           { e.preventDefault(); setTab('template_index'); }
          else if (href.includes('/user/campaign/index'))  { e.preventDefault(); setTab('campaign_index'); }
          else if (href.includes('/user/campaign/create')) { e.preventDefault(); setTab('campaign_create'); }
          else if (href.includes('/user/customer/list'))   { e.preventDefault(); setTab('customer_list'); }
          else if (href.includes('/user/customer/create')) { e.preventDefault(); setTab('customer_create'); }
          else if (href.includes('/user/orders/list'))     { e.preventDefault(); setTab('orders_list'); }
          else if (href.includes('/user/agent/list'))      { e.preventDefault(); setTab('agent_list'); }
          else if (href.includes('/user/agent/create'))    { e.preventDefault(); setTab('agent_create'); }
          else if (href.includes('/user/saved-reply/index'))  { e.preventDefault(); setTab('saved_reply_index'); }
          else if (href.includes('/user/saved-reply/create')) { e.preventDefault(); setTab('saved_reply_create'); }
          else if (href.includes('/user/whatsapp-account'))   { e.preventDefault(); setTab('whatsapp_account'); }
          else if (href.includes('/user/subscription/index')) { e.preventDefault(); setTab('subscription_index'); }
          else if (href.includes('/user/profile-setting'))    { e.preventDefault(); setTab('profile_setting'); }
          else if (href.includes('/user/development-credential')) { e.preventDefault(); setTab('development_credential'); }
          else if (href.includes('/user/ip-white-list/index')) { e.preventDefault(); setTab('ip_white_list'); }
          else if (href.includes('/user/twofactor'))       { e.preventDefault(); setTab('twofactor'); }
          else if (href.includes('/user/change-password')) { e.preventDefault(); setTab('change_password'); }
          else if (href.includes('/user/contact/list'))           { e.preventDefault(); setTab('contact_list'); }
          else if (href.includes('/user/contact-tag/list'))       { e.preventDefault(); setTab('contact_tag_list'); }
          else if (href.includes('/user/contactlist/list'))       { e.preventDefault(); setTab('contactlist_list'); }
          else if (href.includes('/user/automation/welcome-message')) { e.preventDefault(); setTab('automation_welcome_message'); }
          else if (href.includes('/user/flow-builder'))           { e.preventDefault(); setTab('flow_builder'); }
          else if (href.includes('/user/automation/ai-bot'))      { e.preventDefault(); setTab('automation_ai_bot'); }
          else if (href.includes('/user/shortlink/create'))       { e.preventDefault(); setTab('shortlink_create'); }
          else if (href.includes('/user/shortlink/index'))        { e.preventDefault(); setTab('shortlink_index'); }
          else if (href.includes('/user/floater/create'))         { e.preventDefault(); setTab('floater_create'); }
          else if (href.includes('/user/floater/index'))          { e.preventDefault(); setTab('floater_index'); }
          else if (href.includes('/user/cta-url/create'))         { e.preventDefault(); setTab('cta_url_create'); }
          else if (href.includes('/user/cta-url/index'))          { e.preventDefault(); setTab('cta_url_index'); }
          else if (href.includes('/user/interactive-list/create')) { e.preventDefault(); setTab('interactive_list_create'); }
          else if (href.includes('/user/interactive-list/index'))  { e.preventDefault(); setTab('interactive_list_index'); }
          else if (href.includes('/user/ecommerce/woo-commerce/products')) { e.preventDefault(); setTab('ecommerce_woocommerce_products'); }
          else if (href.includes('/user/ecommerce/woo-commerce/config'))   { e.preventDefault(); setTab('ecommerce_woocommerce_config'); }
          else if (href.includes('/user/deposit/history'))        { e.preventDefault(); setTab('deposit_history'); }
          else if (href.includes('/user/withdraw/history'))       { e.preventDefault(); setTab('withdraw_history'); }
          else if (href.includes('/user/transactions'))           { e.preventDefault(); setTab('transactions'); }
          else if (href.includes('/user/whatsapp-pricing'))       { e.preventDefault(); setTab('whatsapp_pricing'); }
          else if (href.includes('/user/referral/index'))         { e.preventDefault(); setTab('referral_index'); }
          else if (href.includes('/help'))                        { e.preventDefault(); setTab('help'); }
          else if (href.includes('/user-guide'))                  { e.preventDefault(); setTab('user_guide'); }
          else if (href.includes('/user/whatsray-assistant'))     { e.preventDefault(); setTab('whatsray_assistant'); }
          else if (href.includes('/ticket'))                      { e.preventDefault(); setTab('ticket'); }
          else if (href.includes('/user/logout')) { e.preventDefault(); onLogout(); }
          else if (href.includes('#') && (anchor.classList.contains('sidebar-menu-list__link') || anchor.closest('.has-dropdown'))) {
            // Let sidebar dropdowns pass through
          } else if (href.startsWith('http') && !href.includes('localhost')) {
            e.preventDefault();
            if (window.notify) window.notify('info', 'This feature is running in demo mode.');
            else alert('This feature is running in demo mode.');
          }
        }
      }
    };

    const handleFormSubmit = (e) => {
      const form = e.target.closest('form');
      if (form) {
        if (form.id === 'mock-chat-form') return;

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
        else alert('Operation completed (Demo Mode).');
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleGlobalClick);
      container.addEventListener('submit', handleFormSubmit);
    }
    return () => {
      if (container) {
        container.removeEventListener('click', handleGlobalClick);
        container.removeEventListener('submit', handleFormSubmit);
      }
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
      title: `WhatsRay - ${title}`,
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

  const currentPage = isMarketingTool(tab) 
    ? getMarketingLockedPage(tab) 
    : (dashboardPages[tab] || getMockPage(tab));
  
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
      
      {/* ── Preloader Element visible on state triggers ── */}
      <div className="preloader" style={{ display: isPageLoading ? 'flex' : 'none' }}>
        <span className="loader"></span>
      </div>

      <div className="dashboard__inner flex-wrap">

        {/* ── Sidebar ── */}
        <div
          className={`sidebar-menu flex-between ${isSidebarHovered ? '' : 'sidebar-collapsed'} ${isSidebarMobileOpen ? 'show-sidebar' : ''}`}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className="sidebar-menu__inner">
            <span className="sidebar-menu__close d-lg-none d-block" onClick={() => setIsSidebarMobileOpen(false)}>
              <i className="fas fa-times" />
            </span>
            <div className="sidebar-logo">
              <a href="/user/dashboard" className="sidebar-logo__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); }}>
                <img src="https://wpp.raybeamdigital.com/assets/images/logo_icon/logo.png" alt="logo" />
              </a>
            </div>

            <ul className="sidebar-menu-list">
              {/* Dashboard */}
              <li className={`sidebar-menu-list__item ${tab === 'dashboard' ? 'active' : ''}`}>
                <a href="/user/dashboard" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); }}>
                  <span className="icon"><i className="las la-th-large" /></span>
                  <span className="text">My Dashboard</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">CRM TOOLS</span></li>

              {/* Manage Inbox */}
              <li className={`sidebar-menu-list__item ${tab === 'inbox' ? 'active' : ''}`}>
                <a href="/user/inbox" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('inbox'); }}>
                  <span className="icon"><i className="las la-sms" /></span>
                  <span className="text">Manage Inbox</span>
                </a>
              </li>

              {/* Manage Customer */}
              <li className={`sidebar-menu-list__item ${tab === 'customer_list' || tab === 'customer_create' ? 'active' : ''}`}>
                <a href="/user/customer/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('customer_list'); }}>
                  <span className="icon"><i className="las la-users" /></span>
                  <span className="text">Manage Customer</span>
                </a>
              </li>

              {/* Manage Orders */}
              <li className={`sidebar-menu-list__item ${tab === 'orders_list' ? 'active' : ''}`}>
                <a href="/user/orders/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('orders_list'); }}>
                  <span className="icon"><i className="las la-shopping-basket" /></span>
                  <span className="text">Manage Orders</span>
                </a>
              </li>

              {/* Track Customer Orders */}
              <li className={`sidebar-menu-list__item ${tab === 'track_orders' ? 'active' : ''}`}>
                <a href="/user/tracking" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('track_orders'); }}>
                  <span className="icon"><i className="las la-truck-loading" /></span>
                  <span className="text">Track Customer Orders</span>
                </a>
              </li>

              {/* Manage Agent */}
              <li className={`sidebar-menu-list__item ${tab === 'agent_list' || tab === 'agent_create' ? 'active' : ''}`}>
                <a href="/user/agent/list" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('agent_list'); }}>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'contact_list' ? 'active' : ''}`}><a href="/user/contact/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contact_list'); }}><span className="text">Manage Contacts</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'contact_tag_list' ? 'active' : ''}`}><a href="/user/contact-tag/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contact_tag_list'); }}><span className="text">Manage Contact Tag</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'contactlist_list' ? 'active' : ''}`}><a href="/user/contactlist/list" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('contactlist_list'); }}><span className="text">Manage Contact List</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Saved Replies */}
              <li className={`sidebar-menu-list__item ${tab === 'saved_reply_index' || tab === 'saved_reply_create' ? 'active' : ''}`}>
                <a href="/user/saved-reply/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('saved_reply_index'); }}>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'template_create' ? 'active' : ''}`}><a href="/user/template/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_create'); }}><span className="text">New Template</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'template_create_carousel' ? 'active' : ''}`}><a href="/user/template/create/carousel" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_create_carousel'); }}><span className="text">Carousel Template</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'template_index' ? 'active' : ''}`}><a href="/user/template/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('template_index'); }}><span className="text">All Template</span></a></li>
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
                      <a href="/user/campaign/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_create'); }}><span className="text">New Campaign</span></a>
                    </li>
                    <li className={`sidebar-submenu-list__item ${tab === 'campaign_index' ? 'active' : ''}`}>
                      <a href="/user/campaign/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_index'); }}><span className="text">All Campaign</span></a>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'automation_welcome_message' ? 'active' : ''}`}><a href="/user/automation/welcome-message" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('automation_welcome_message'); }}><span className="text">Welcome Message</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'flow_builder' ? 'active' : ''}`}><a href="/user/flow-builder" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('flow_builder'); }}><span className="text">Flow Builder</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'automation_ai_bot' ? 'active' : ''}`}><a href="/user/automation/ai-bot" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('automation_ai_bot'); }}><span className="text">AI Bots</span></a></li>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'shortlink_create' ? 'active' : ''}`}><a href="/user/shortlink/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('shortlink_create'); }}><span className="text">Create ShortLink</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'shortlink_index' ? 'active' : ''}`}><a href="/user/shortlink/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('shortlink_index'); }}><span className="text">Manage ShortLink</span></a></li>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'floater_create' ? 'active' : ''}`}><a href="/user/floater/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('floater_create'); }}><span className="text">Create Floater</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'floater_index' ? 'active' : ''}`}><a href="/user/floater/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('floater_index'); }}><span className="text">Manage Floater</span></a></li>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'cta_url_create' ? 'active' : ''}`}><a href="/user/cta-url/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('cta_url_create'); }}><span className="text">Create URL</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'cta_url_index' ? 'active' : ''}`}><a href="/user/cta-url/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('cta_url_index'); }}><span className="text">CTA URl List</span></a></li>
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
                    <li className={`sidebar-submenu-list__item ${tab === 'interactive_list_create' ? 'active' : ''}`}><a href="/user/interactive-list/create" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('interactive_list_create'); }}><span className="text">Create List</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'interactive_list_index' ? 'active' : ''}`}><a href="/user/interactive-list/index" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('interactive_list_index'); }}><span className="text">Interactive List</span></a></li>
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
                            <a href="/user/ecommerce/woo-commerce/products" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ecommerce_woocommerce_products'); }}>
                              <span className="text">Products</span>
                            </a>
                          </li>
                          <li className={`sidebar-submenu-list__item ${tab === 'ecommerce_woocommerce_config' ? 'active' : ''}`}>
                            <a href="/user/ecommerce/woo-commerce/config" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ecommerce_woocommerce_config'); }}>
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
                <a href="/user/deposit/history" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('deposit_history'); }}>
                  <span className="icon"><i className="las la-money-bill" /></span>
                  <span className="text">Manage Deposit</span>
                </a>
              </li>

              {/* Manage Withdraw */}
              <li className={`sidebar-menu-list__item ${tab === 'withdraw_history' ? 'active' : ''}`}>
                <a href="/user/withdraw/history" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('withdraw_history'); }}>
                  <span className="icon"><i className="las la-wallet" /></span>
                  <span className="text">Manage Withdraw</span>
                </a>
              </li>

              {/* Transactions Logs */}
              <li className={`sidebar-menu-list__item ${tab === 'transactions' ? 'active' : ''}`}>
                <a href="/user/transactions" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('transactions'); }}>
                  <span className="icon"><i className="las la-exchange-alt" /></span>
                  <span className="text">Transactions Logs</span>
                </a>
              </li>

              {/* WhatsApp Pricing */}
              <li className={`sidebar-menu-list__item ${tab === 'whatsapp_pricing' ? 'active' : ''}`}>
                <a href="/user/whatsapp-pricing" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsapp_pricing'); }}>
                  <span className="icon"><i className="lab la-whatsapp" /></span>
                  <span className="text">WhatsApp Pricing</span>
                </a>
              </li>

              {/* Manage Referrals */}
              <li className={`sidebar-menu-list__item ${tab === 'referral_index' ? 'active' : ''}`}>
                <a href="/user/referral/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('referral_index'); }}>
                  <span className="icon"><i className="las la-share-alt" /></span>
                  <span className="text">Manage Referrals</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">BILLING &amp; PROFILE</span></li>

              {/* Whatsapp Accounts */}
              <li className={`sidebar-menu-list__item ${tab === 'whatsapp_account' ? 'active' : ''}`}>
                <a href="/user/whatsapp-account" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); }}>
                  <span className="icon"><i className="las la-phone" /></span>
                  <span className="text">Whatsapp Accounts</span>
                </a>
              </li>

              {/* Business Profile */}
              <li className={`sidebar-menu-list__item ${tab === 'business_profile' ? 'active' : ''}`}>
                <a href="/user/business-profile" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('business_profile'); }}>
                  <span className="icon"><i className="las la-store" /></span>
                  <span className="text">Business Profile</span>
                </a>
              </li>

              {/* Subscription Info */}
              <li className={`sidebar-menu-list__item ${tab === 'subscription_index' ? 'active' : ''}`}>
                <a href="/user/subscription/index" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); }}>
                  <span className="icon"><i className="las la-dollar-sign" /></span>
                  <span className="text">Subscription Info</span>
                </a>
              </li>

              <li className="sidebar-menu-list__title"><span className="text">SETTINGS &amp; HELP</span></li>

              {/* Help & Support dropdown */}
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['help'] || ['help', 'user_guide', 'whatsray_assistant', 'ticket'].includes(tab) ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('help'); }}>
                  <span className="icon"><i className="las la-life-ring" /></span>
                  <span className="text">Help &amp; Support</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['help'] || ['help', 'user_guide', 'whatsray_assistant', 'ticket'].includes(tab)) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'help' ? 'active' : ''}`}><a href="/help" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('help'); }}><span className="text">Help Center</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'user_guide' ? 'active' : ''}`}><a href="/user-guide" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('user_guide'); }}><span className="text">User Guide</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'whatsray_assistant' ? 'active' : ''}`}><a href="/user/whatsray-assistant" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsray_assistant'); }}><span className="text">WhatsRay AI Support</span></a></li>
                    <li className={`sidebar-submenu-list__item ${tab === 'ticket' ? 'active' : ''}`}><a href="/ticket" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('ticket'); }}><span className="text">Support Ticket</span></a></li>
                  </ul>
                </div>
              </li>

              {/* Manage Profile */}
              <li className={`sidebar-menu-list__item ${tab === 'profile_setting' ? 'active' : ''}`}>
                <a href="/user/profile-setting" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); }}>
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
                  <h3 className="title">{currentPage.title ? currentPage.title.replace('WhatsRay - ', '') : 'Dashboard'}</h3>
                </div>

                <div className="dashboard-header__right" style={{ display: 'flex', alignItems: 'center' }}>
                  {/* WhatsApp Active Session Selector Dropdown */}
                  {sessions.length > 0 && (
                    <div className="user-info" style={{ marginRight: '16px', position: 'relative' }}>
                      <div className="user-info__right" onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}>
                        <div className="user-info__button" style={{ cursor: 'pointer', padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                          <span className="icon" style={{ marginRight: '8px', color: '#00832e', display: 'flex', alignItems: 'center' }}><i className="fa-brands fa-whatsapp fa-xl"></i></span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', paddingRight: '4px' }}>
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
                              left: 0, 
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
                                    localStorage.setItem('whatsray_active_session_id', s.id);
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
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/profile-setting" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); setIsProfileOpen(false); }}><span className="icon"><i className="far fa-user" /></span><span className="text">View Profile</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/subscription/index" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); setIsProfileOpen(false); }}><span className="icon"><i className="fa-solid fa-dollar-sign" /></span><span className="text">Subscription Info</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/whatsapp-account" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); setIsProfileOpen(false); }}><span className="icon"><i className="fa-brands fa-whatsapp" /></span><span className="text">WhatsApp Account</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/development-credential" onClick={(e) => { e.preventDefault(); setTab('development_credential'); setIsProfileOpen(false); }}><span className="icon"><i className="fab fa-codepen" /></span><span className="text">Developer Tool</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/ip-white-list/index" onClick={(e) => { e.preventDefault(); setTab('ip_white_list'); setIsProfileOpen(false); }}><span className="icon"><i className="fas fa-mobile" /></span><span className="text">IP White List</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/twofactor" onClick={(e) => { e.preventDefault(); setTab('twofactor'); setIsProfileOpen(false); }}><span className="icon"><i className="fa-solid fa-shield-halved" /></span><span className="text">2FA Setting</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link" href="/user/change-password" onClick={(e) => { e.preventDefault(); setTab('change_password'); setIsProfileOpen(false); }}><span className="icon"><i className="fas fa-key" /></span><span className="text">Change Password</span></a></li>
                      <li className="user-info-dropdown__item"><a className="user-info-dropdown__link text--danger" href="#" onClick={(e) => { e.preventDefault(); onLogout(); setIsProfileOpen(false); }}><span className="icon text--danger"><i className="fa-solid fa-arrow-right-from-bracket" /></span><span className="text text--danger">Sign Out</span></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="dashboard-header__shape">
                <img src="https://wpp.raybeamdigital.com/assets/templates/basic/images/ds-1.png" alt="" />
              </div>
            </div>

            {/* Page content injected from scraped HTML / mockups */}
            <div className="dashboard-body">
              {tab === 'whatsapp_account' ? (
                <WhatsAppAccountManager activeSessionId={activeSessionId} onSessionsUpdated={fetchSessions} user={user} />
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
              ) : (
                <div dangerouslySetInnerHTML={{
                  __html: (currentPage.body || '<h3>Page not found</h3>')
                    .replace('__USER_PLAN__', user?.plan || 'Free')
                    .replace('__TOTAL_EARNED__', (stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_DEPOSITS__', (stats?.total_deposits ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_WITHDRAWALS__', (stats?.total_withdrawals ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    .replace('__TOTAL_CONTACTS__', (stats?.total_contacts ?? 0).toString())
                    .replace('__TOTAL_TAGS__', (stats?.total_tags ?? 0).toString())
                    .replace('__TOTAL_LISTS__', (stats?.total_lists ?? 0).toString())
                    .replace('__ACTIVE_FLOWS__', (stats?.active_flows ?? 0).toString())
                    .replace('__AI_BOTS__', (stats?.ai_bots ?? 0).toString())
                }} />
              )}
            </div>

          </div>
        </div>

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
    logo_url: null,
    photo_urls: []
  });
  const [logoFile, setLogoFile] = useState(null);
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
      formData.append('description', profile.description || '');
      formData.append('address', profile.address || '');
      formData.append('sizes_info', profile.sizes_info || '');
      
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4 text-center">Status Label</th>
                  <th className="p-4">Last Message</th>
                  <th className="p-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={c.profile_pic_url || 'https://wpp.raybeamdigital.com/assets/images/avatar.png'}
                        className="w-9 h-9 rounded-full object-cover border border-gray-100"
                        onError={(e) => { e.target.src = 'https://wpp.raybeamdigital.com/assets/images/avatar.png'; }}
                      />
                      <span className="font-bold text-neutral-800">{c.sender_name || 'Customer'}</span>
                    </td>
                    <td className="p-4 font-medium text-neutral-800 font-mono">
                      {c.sender_phone}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        c.label === 'Confirmed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {c.label || 'Interested'}
                      </span>
                    </td>
                    <td className="p-4 max-w-[240px] text-gray-600 truncate" title={c.last_message}>
                      {c.last_message || '—'}
                    </td>
                    <td className="p-4 text-gray-500 font-mono">
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
  const [courierName, setCourierName] = useState('Sri Lanka Post');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('Out for Delivery');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourier, setFilterCourier] = useState('All');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const COURIER_LOGOS = {
    'Sri Lanka Post': 'data:image/png;base64,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',
    'Citypak (Hayleys)': 'https://logo.clearbit.com/citypak.lk',
    'Aramex': 'data:image/png;base64,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',
    'DHL Express': 'https://th.bing.com/th?q=DHL+Logo+Icon+PNG&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-SG&cc=SG&setlang=en&adlt=strict&t=1&mw=247',
    'FedEx': 'https://th.bing.com/th/id/OIP.vuc88Kmi3r_f8yGuQPHVGgHaHa?w=169&h=180&c=7&r=0&o=7&pid=1.7&rm=3',
    'Pronto': 'https://th.bing.com/th/id/OIP.U13AT8WXkPdZRaq4MD_ofwHaHa?w=176&h=180&c=7&r=0&o=7&pid=1.7&rm=3'
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
          setCourierName(data[0].courier_name || 'Sri Lanka Post');
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
        alert('Courier Tracking details linked successfully!');
      } else {
        alert('Failed to update tracking details.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setCourierName(order.courier_name || 'Sri Lanka Post');
    setTrackingNumber(order.tracking_number || '');
    setTrackingStatus(order.tracking_status || 'Out for Delivery');
  };

  const filteredOrders = orders.filter(o => {
    // 1. Filter by Courier selection
    if (filterCourier !== 'All') {
      if (o.courier_name !== filterCourier) return false;
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
          <span>All Couriers</span>
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
                  width: name === 'Aramex' ? '70px' : name === 'Sri Lanka Post' ? '75px' : name === 'FedEx' ? '65px' : '40px', 
                  height: '40px', 
                  objectFit: 'contain', 
                  borderRadius: '6px'
                }} 
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_TRUCK; }}
              />
              <span>{name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Main 2-Column workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left side: Orders Selector list */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Shipments Register</h4>
          
          {filteredOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="las la-truck-loading" style={{ fontSize: '48px', marginBottom: '8px', display: 'block' }}></i>
              No matching orders found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                              src={COURIER_LOGOS[o.courier_name]} 
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
                    src={COURIER_LOGOS[selectedOrder.courier_name]} 
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
                  src={COURIER_LOGOS[courierName]} 
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
                    <option value="Sri Lanka Post">Sri Lanka Post</option>
                    <option value="Citypak (Hayleys)">Citypak (Hayleys)</option>
                    <option value="Aramex">Aramex</option>
                    <option value="DHL Express">DHL Express</option>
                    <option value="FedEx">FedEx</option>
                    <option value="Pronto">Pronto</option>
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



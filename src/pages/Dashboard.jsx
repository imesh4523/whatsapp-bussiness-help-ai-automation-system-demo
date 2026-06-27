import React, { useState, useEffect, useRef } from 'react';
import dashboardPages from '../data/dashboardPages.json';
import { API_BASE_URL } from '../config';


const getTabFromPath = (path) => {
  const pathToTabMap = {
    '/user/dashboard': 'dashboard',
    '/user/inbox': 'inbox',
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
      <div className="p-8 text-center max-w-md mx-auto space-y-6">
        <div className="inline-flex p-4 bg-orange-50 rounded-full text-orange-600">
          <i className="lab la-whatsapp" style={{ fontSize: '48px' }}></i>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-neutral-800">WhatsApp Offline</h3>
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            Please link a WhatsApp account first under the "WhatsApp Account" tab to activate your live inbox panel.
          </p>
        </div>
        <a href="/user/whatsapp-account" className="btn btn-sm btn--base px-4 py-2" onClick={(e) => { e.preventDefault(); window.location.href='/user/whatsapp-account'; }}>
          Connect WhatsApp
        </a>
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
  }, []);

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
            <div className="p-8 text-center text-xs text-gray-400">
              No orders match this status or search criteria.
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
    if (window.location.pathname !== newPath) {
      window.location.href = newPath;
    } else {
      setTabState(newTab);
    }
  };

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('whatsray_active_session_id') || '');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);

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

              ) : (
                <div dangerouslySetInnerHTML={{ __html: (currentPage.body || '<h3>Page not found</h3>').replace('__USER_PLAN__', user?.plan || 'Free') }} />
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;

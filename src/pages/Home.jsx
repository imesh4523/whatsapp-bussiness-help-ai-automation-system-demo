import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'AI-Powered Chat',
    desc: 'Your business gets a 24/7 intelligent WhatsApp assistant that understands customer queries, answers FAQs, and handles orders automatically.'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    title: 'Merchant Dashboard',
    desc: 'A beautiful control panel to manage your products, view incoming orders, chat history, customer profiles and business analytics in real-time.'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
    title: 'Smart Order Management',
    desc: 'Customers order directly through WhatsApp. Orders are captured, labelled and tracked — all from within your dashboard. No third-party apps needed.'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Real-time Analytics',
    desc: 'Track message volume, customer activity, conversion rates, and revenue trends with beautifully presented live dashboards.'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    title: 'Broadcast Campaigns',
    desc: 'Send promotional messages, new arrivals alerts, and seasonal offers to your customer list — all within WhatsApp at the tap of a button.'
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Secure & Scalable',
    desc: 'Enterprise-grade security with role-based access. Built to scale from 1 WhatsApp number to 100+ accounts with zero downtime.'
  }
];

const STEPS = [
  {
    title: 'Join to Platform',
    desc: 'Sign up for free and unlock a full-featured marketing and CRM platform within seconds',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    )
  },
  {
    title: 'Explore our Feature',
    desc: 'Discover powerful tools like automation, campaign builders, and conversion boosters.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 15l-3-3" />
        <path d="M17 14.5a2.5 2.5 0 0 0 2.5-2.5" />
      </svg>
    )
  },
  {
    title: 'Add or Import Your Contacts',
    desc: 'Add contacts manually or bulk import from your CRM tools, spreadsheets, or integrations.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10M6 10h10M6 14h10M10 18h6" />
      </svg>
    )
  },
  {
    title: 'Send Message or Create Campaign',
    desc: 'Launch personalized messages or smart campaigns with real-time insights.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    )
  }
];

const PLANS = [
  {
    name: 'Starter',
    price: '2,500',
    period: '/mo',
    desc: 'Perfect for small businesses just getting started with WhatsApp automation.',
    features: ['1 WhatsApp Number', '500 AI Responses/mo', 'Product Catalog (up to 50)', 'Order Management', 'Basic Analytics', 'Email Support'],
    cta: 'Get Started',
    highlight: false
  },
  {
    name: 'Growth',
    price: '5,500',
    period: '/mo',
    desc: 'For growing businesses that need more power and customer reach.',
    features: ['3 WhatsApp Numbers', '2,500 AI Responses/mo', 'Unlimited Products', 'Broadcast Campaigns', 'Advanced Analytics', 'Priority Support', 'Custom AI Persona'],
    cta: 'Most Popular',
    highlight: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large-scale operations managing multiple brands or franchises.',
    features: ['Unlimited Numbers', 'Unlimited AI Responses', 'Multi-store Management', 'API Access', 'Dedicated Account Manager', 'White-label Option', 'SLA Guarantee'],
    cta: 'Contact Sales',
    highlight: false
  }
];

// Helper component for WhatsApp message bubble
const ChatMessage = ({ sender, time = "10:30", isAI, children, seen = true }) => (
  <div className={`flex flex-col ${isAI ? "items-end" : "items-start"} mb-2.5 w-full`}>
    <span className={`text-[9px] px-1.5 py-0.5 rounded mb-0.5 font-bold tracking-wide flex items-center gap-0.5 ${
      isAI ? "bg-[#25D366]/20 text-[#075E54]" : "bg-gray-200/80 text-gray-500"
    }`}>
      {isAI && <span className="text-[11px] leading-none">🐰</span>}
      {sender}
    </span>
    <div 
      className={`relative max-w-[85%] px-3 py-2 text-[13px] leading-relaxed shadow-sm font-medium ${
        isAI ? "bg-[#dcf8c6] text-gray-800 rounded-lg rounded-tr-sm" : "bg-white text-gray-800 rounded-lg rounded-tl-sm"
      }`}
      style={{ border: '1px solid rgba(0,0,0,0.03)' }}
    >
      {children}
      <span className="flex items-center justify-end gap-0.5 mt-1 text-[8px] text-gray-400">
        <span>{time}</span>
        {!isAI && (
          <svg viewBox="0 0 16 11" fill={seen ? "#53BDEB" : "#A0A0A0"} className="w-3 h-2.5">
            <path d="M11.071.653a.75.75 0 0 1 .206 1.04l-6 9a.75.75 0 0 1-1.177.094l-3-3a.75.75 0 1 1 1.06-1.06l2.36 2.36 5.51-8.228a.75.75 0 0 1 1.04-.206z"/>
            <path d="M14.571.653a.75.75 0 0 1 .206 1.04l-6 9a.75.75 0 0 1-1.177.094.75.75 0 0 0 .998-.156l6-9a.75.75 0 0 1-.027-.978z" opacity=".5"/>
          </svg>
        )}
      </span>
    </div>
  </div>
);

// Container mimicking WhatsApp screen with internal scrolling (Clean, no header like screenshot)
const ChatContainer = ({ children }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div 
      className="rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm"
      style={{
        height: '290px',
        backgroundColor: '#ECE5DD',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      <div ref={scrollRef} className="h-full overflow-y-auto p-4 flex flex-col items-start scrollbar-none">
        {children}
      </div>
    </div>
  );
};

// Mockup 1: No Bot Vibes
const NoBotVibesMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const steps = [0, 1500, 2800, 4200, 5600];
    const timers = steps.map((delay, index) => 
      setTimeout(() => setStep(index), delay)
    );
    const interval = setInterval(() => {
      setStep(0);
      steps.forEach((delay, index) => {
        setTimeout(() => setStep(index), delay);
      });
    }, 8500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <ChatContainer>
      {step >= 0 && (
        <ChatMessage sender="Customer" time="3:15 PM" isAI={false}>
          <img src="/product-dress-original.jpg" alt="Dress" className="w-24 h-24 object-cover rounded-lg mb-1" />
          <span>Meka thiyanawa da?</span>
        </ChatMessage>
      )}
      {step === 1 && (
        <div className="flex gap-1.5 items-center p-2 text-gray-500 text-[10px] italic">
          <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E] animate-bounce" style={{ animationDelay: '300ms' }} />
          <span>checking stock...</span>
        </div>
      )}
      {step >= 2 && (
        <ChatMessage sender="AgentBunny" time="3:15 PM" isAI={true}>
          <span>Ow thiyanawa! M saha L witharai danata. Rs. 3,200/- 🛍️</span>
        </ChatMessage>
      )}
      {step >= 3 && (
        <div className="w-full flex justify-center my-1.5">
          <span className="text-[9px] bg-white/90 text-gray-500 px-2 py-0.5 rounded-full shadow-sm">
            ⚡ Real conversation, no buttons
          </span>
        </div>
      )}
      {step >= 4 && (
        <ChatMessage sender="Customer" time="3:16 PM" isAI={false}>
          <span>M size ekak order karanna.</span>
        </ChatMessage>
      )}
    </ChatContainer>
  );
};

// Mockup 2: Close Sales You're Losing
const CloseSalesMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const steps = [0, 1200, 2400, 3600, 4800];
    const timers = steps.map((delay, index) => 
      setTimeout(() => setStep(index), delay)
    );
    const interval = setInterval(() => {
      setStep(0);
      steps.forEach((delay, index) => {
        setTimeout(() => setStep(index), delay);
      });
    }, 7500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <ChatContainer>
      {step >= 0 && (
        <div className="w-full text-center my-1">
          <span className="text-[8px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Yesterday</span>
        </div>
      )}
      {step >= 0 && (
        <ChatMessage sender="Customer" time="3:45 PM" isAI={false}>
          <span>Jacket eka ganna onee. Gana kiyada?</span>
        </ChatMessage>
      )}
      {step >= 1 && (
        <ChatMessage sender="AgentBunny" time="3:45 PM" isAI={true}>
          <span>Rs. 4,500/- Size S, M, L thiyenawa 👍</span>
        </ChatMessage>
      )}
      {step >= 2 && (
        <div className="w-full text-center my-1">
          <span className="text-[8px] bg-white text-gray-500 px-1.5 py-0.5 rounded shadow-sm">Today</span>
        </div>
      )}
      {step >= 2 && (
        <ChatMessage sender="AgentBunny" time="10:30 AM" isAI={true}>
          <span>Jacket eka gannawada? Thawa 2i thiyenne. 🔥</span>
        </ChatMessage>
      )}
      {step >= 3 && (
        <ChatMessage sender="Customer" time="10:31 AM" isAI={false}>
          <span>Ow. Details ewannada?</span>
        </ChatMessage>
      )}
      {step >= 4 && (
        <ChatMessage sender="AgentBunny" time="10:31 AM" isAI={true}>
          <span>Ow, Address ekai phone number ekai danna. 📝</span>
        </ChatMessage>
      )}
    </ChatContainer>
  );
};


const LOGOS = [
  {
    name: 'OpenAI',
    icon: (
      <svg className="w-5 h-5 mr-2" style={{ fill: '#10a37f' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
      </svg>
    )
  },
  {
    name: 'Meta Llama',
    icon: (
      <svg className="w-5 h-5 mr-2" style={{ fill: '#0081FB' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"/>
      </svg>
    )
  },
  {
    name: 'Google Gemini',
    icon: (
      <svg className="w-5 h-5 mr-2 animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="50%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96B27" />
          </linearGradient>
        </defs>
        <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" fill="url(#gemini-grad)"/>
      </svg>
    )
  },
  {
    name: 'Anthropic Claude',
    icon: (
      <svg className="w-5 h-5 mr-2" style={{ fill: '#d97756' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/>
      </svg>
    )
  },
  {
    name: 'Mistral AI',
    icon: (
      <svg className="w-5 h-5 mr-2" style={{ fill: '#FF5D18' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z"/>
      </svg>
    )
  },
  {
    name: 'DeepSeek',
    icon: (
      <svg className="w-5 h-5 mr-2" style={{ fill: '#0050ff' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45"/>
      </svg>
    )
  }
];

const FAQS = [
  {
    question: "Do I need a new WhatsApp number?",
    answer: "No. In most cases, we can connect AgentBunny to your existing WhatsApp Business App through our official Meta Partner integration, so your current WhatsApp can continue functioning normally."
  },
  {
    question: "Will my current WhatsApp Business App still work?",
    answer: "Yes. Your team can continue using the WhatsApp Business App as usual while AgentBunny handles automation, product questions, and order collection in the background."
  },
  {
    question: "How long does onboarding take from my side?",
    answer: "Usually around 20 minutes of your time. We collect the key business details, products, FAQs, policies, and WhatsApp setup information, then our team handles the training and configuration."
  },
  {
    question: "When can my business go live?",
    answer: "Most businesses go live within a week, depending on how quickly the WhatsApp connection, product information, and business rules are ready."
  },
  {
    question: "What happens after I click Get Started?",
    answer: "You’ll open WhatsApp with our team. We’ll confirm your current WhatsApp setup, recommend the right plan, and guide you through the short onboarding process."
  },
  {
    question: "Do you train the AI for my business?",
    answer: "Yes. We train AgentBunny using your products, FAQs, delivery rules, pricing, policies, tone of voice, and common customer questions, so it can reply like a knowledgeable salesperson."
  },
  {
    question: "Can my team use it too?",
    answer: "Yes. All plans include unlimited CRM seats, so your team can manage customers and orders without per-seat charges."
  },
  {
    question: "What if I exceed AI credits?",
    answer: "Your AI agent does not stop. Extra responses are billed at Rs. 2 each, so you don’t miss sales during busy periods."
  },
  {
    question: "Can I upgrade later?",
    answer: "Yes. You can start with the plan that fits today and upgrade when you need more credits, more WhatsApp numbers, a storefront, or custom support."
  }
];

function Home({ onOpenAuth, onNavigate }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [pricingPlans, setPricingPlans] = useState(PLANS);

  useEffect(() => {
    fetch(`${API_BASE_URL}/plans`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(p => ({
            name: p.id,
            price: p.id === 'Enterprise' ? 'Custom' : Number(p.price).toLocaleString(),
            period: p.id === 'Enterprise' ? '' : '/mo',
            desc: p.id === 'Starter' ? 'Perfect for small businesses just getting started with WhatsApp automation.'
                : p.id === 'Growth' ? 'For growing businesses that need more power and customer reach.'
                : 'For large-scale operations managing multiple brands or franchises.',
            features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]'),
            cta: p.id === 'Starter' ? 'Get Started' : p.id === 'Growth' ? 'Most Popular' : 'Contact Sales',
            highlight: p.id === 'Growth'
          }));
          setPricingPlans(mapped);
        }
      })
      .catch(err => console.warn('Failed to load plans from server:', err));
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="w-full overflow-x-hidden">

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pb-16 pt-32 overflow-hidden bg-white">
        {/* Background glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#25D366]/8 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#128C7E]/6 blur-[120px] pointer-events-none" />

        {/* Animated WhatsApp Orbits/Signals & Feature Badges in Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          {/* WhatsApp Pulse Signals */}
          <div className="auth-login__signal" style={{ left: '10%', marginLeft: 0, top: '20%', transform: 'scale(0.75)', animationDuration: '2.5s' }}>
            <span className="auth-login__signal-icon"><i className="lab la-whatsapp text-[#25D366]"></i></span>
          </div>
          <div className="auth-login__signal" style={{ left: '6%', marginLeft: 0, top: '65%', transform: 'scale(0.6)', animationDuration: '3.1s' }}>
            <span className="auth-login__signal-icon"><i className="lab la-whatsapp text-[#25D366]"></i></span>
          </div>
          <div className="auth-login__signal" style={{ right: '8%', left: 'auto', marginLeft: 0, top: '24%', transform: 'scale(0.7)', animationDuration: '2.8s' }}>
            <span className="auth-login__signal-icon"><i className="lab la-whatsapp text-[#25D366]"></i></span>
          </div>
          <div className="auth-login__signal" style={{ right: '12%', left: 'auto', marginLeft: 0, top: '68%', transform: 'scale(0.55)', animationDuration: '3.4s' }}>
            <span className="auth-login__signal-icon"><i className="lab la-whatsapp text-[#25D366]"></i></span>
          </div>

          {/* Floating Feature Badges */}
          <div className="auth-login__badge absolute" style={{ left: '16%', top: '38%', animationDelay: '0.4s' }}>
            <i className="las la-inbox text-[#25D366]"></i>
            <span>Inbox</span>
          </div>
          <div className="auth-login__badge absolute" style={{ right: '15%', top: '42%', animationDelay: '0.8s' }}>
            <i className="las la-address-book text-[#25D366]"></i>
            <span>Contacts</span>
          </div>
          <div className="auth-login__badge absolute" style={{ left: '14%', top: '80%', animationDelay: '1.2s' }}>
            <i className="las la-bullhorn text-[#25D366]"></i>
            <span>Campaigns</span>
          </div>
          <div className="auth-login__badge absolute" style={{ right: '12%', top: '78%', animationDelay: '1.6s' }}>
            <i className="las la-cogs text-[#25D366]"></i>
            <span>Automation</span>
          </div>
          <div className="auth-login__badge absolute" style={{ left: '22%', top: '12%', animationDelay: '2.0s' }}>
            <i className="las la-comments text-[#25D366]"></i>
            <span>Shared Inbox</span>
          </div>
        </div>

        {/* WhatsApp badge */}
        <div className="inline-flex items-center gap-2 bg-[#25D366]/8 border border-[#25D366]/20 px-5 py-2.5 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
          <span className="text-xs font-bold tracking-widest text-[#075E54] uppercase">WhatsApp AI Automation</span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-[1.05] tracking-tight max-w-5xl mx-auto mb-8">
          Your Business,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] to-[#128C7E]">
            Always On.
          </span>
        </h1>

        {/* Sub headline */}
        <p className="text-lg md:text-xl text-gray-500 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
          Deploy an intelligent WhatsApp AI agent that handles customer queries,
          processes orders, and grows your business — fully on autopilot, 24/7.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-20">
          <button
            onClick={() => onOpenAuth('register')}
            className="group relative px-10 py-4 bg-[#25D366] hover:bg-[#22c55e] text-white font-bold text-sm tracking-wider rounded-2xl transition-all duration-300 shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 hover:scale-105 border-none cursor-pointer"
          >
            Start Free Trial
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </button>
          <button
            onClick={() => onOpenAuth('login')}
            className="px-10 py-4 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-sm tracking-wider rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 cursor-pointer"
          >
            Sign In
          </button>
        </div>

      </section>

      {/* ── POWERED BY AI MODELS MARQUEE SLIDER ──────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-gray-50/60 py-8 border-y border-gray-100/80 z-10 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <div className="text-gray-400 text-xs font-black tracking-widest uppercase whitespace-nowrap">
            POWERED BY
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee flex items-center gap-16">
              {/* First Set of Logos */}
              {LOGOS.map((logo, idx) => (
                <div key={`set1-${idx}`} className="flex items-center text-gray-700 hover:text-gray-900 transition-colors duration-300 font-bold tracking-tight text-sm select-none">
                  {logo.icon}
                  <span>{logo.name}</span>
                </div>
              ))}
              {/* Second Set of Logos (Duplicate to create loop) */}
              {LOGOS.map((logo, idx) => (
                <div key={`set2-${idx}`} className="flex items-center text-gray-700 hover:text-gray-900 transition-colors duration-300 font-bold tracking-tight text-sm select-none">
                  {logo.icon}
                  <span>{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE CHAT FEATURES SECTION (AGENT ZAPPY STYLE) ────────────────────── */}
      <section className="bg-white py-20 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Everything you need to <span className="text-[#00c6ff] bg-clip-text bg-gradient-to-r from-[#00E5CC] to-[#25D366] text-transparent">automate sales</span>
            </h2>
            <p className="text-gray-500 font-light text-base md:text-lg max-w-2xl mx-auto mt-4 leading-relaxed">
              Powerful features designed to help local businesses convert more customers through conversational commerce.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: No Bot Vibes */}
            <div className="bg-[hsl(0,60%,97%)] rounded-3xl p-8 flex flex-col border border-red-100/50 shadow-sm">
              <div className="mb-6 text-left">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-red-400 inline-block pb-1">
                  No bot vibes
                </h3>
                <p className="text-xs md:text-sm text-gray-600 font-light mt-3 leading-relaxed">
                  No buttons or menus. AgentBunny talks like a real salesman, understanding Singlish and slang naturally.
                </p>
              </div>
              <div className="mt-auto">
                <NoBotVibesMockup />
              </div>
            </div>

            {/* Card 2: Close Sales You're Losing */}
            <div className="bg-[hsl(45,80%,97%)] rounded-3xl p-8 flex flex-col border border-amber-100/50 shadow-sm">
              <div className="mb-6 text-left">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-amber-400 inline-block pb-1">
                  Close the sales you're losing
                </h3>
                <p className="text-xs md:text-sm text-gray-600 font-light mt-3 leading-relaxed">
                  AgentBunny nudges customers who left you on "seen." It chases the payment so you don't have to.
                </p>
              </div>
              <div className="mt-auto">
                <CloseSalesMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-[#f4f6f8] py-24 px-6 relative overflow-hidden">
        {/* Subtle background blobs */}
        <div className="absolute top-0 left-0 w-40 h-[600px] bg-gradient-to-b from-[#25D366]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-40 h-[600px] bg-gradient-to-b from-[#25D366]/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">How it Works?</h2>
            {/* Animated underline */}
            <div className="flex justify-center mb-5">
              <div className="h-[3px] w-10 bg-gray-800 rounded" style={{animation:'growBar 1s ease-out forwards'}} />
            </div>
            <p className="text-gray-500 font-light text-base max-w-xl mx-auto">
              Understand the process from signup to campaign launch in just a few steps
            </p>
          </div>

          {/* Arrow row — desktop only, sits ABOVE the cards */}
          <div className="hidden md:block relative w-full" style={{height:'38px'}}>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 38"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <marker id="hw-arrow" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#25D366" />
                </marker>
              </defs>
              {/* Arc 1 */}
              <path d="M 178 36 Q 250 8 322 36" stroke="#25D366" strokeWidth="1.6" fill="none" strokeLinecap="round" markerEnd="url(#hw-arrow)" />
              {/* Arc 2 */}
              <path d="M 428 36 Q 500 8 572 36" stroke="#25D366" strokeWidth="1.6" fill="none" strokeLinecap="round" markerEnd="url(#hw-arrow)" />
              {/* Arc 3 */}
              <path d="M 678 36 Q 750 8 822 36" stroke="#25D366" strokeWidth="1.6" fill="none" strokeLinecap="round" markerEnd="url(#hw-arrow)" />
            </svg>
          </div>

          {/* 4 Step Cards */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="flex-1 bg-white rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Icon box */}
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-[#25D366]/10 border border-gray-200 group-hover:border-[#25D366]/20 rounded-xl flex items-center justify-center mb-5 text-gray-600 group-hover:text-[#25D366] transition-all duration-300">
                  {step.icon}
                </div>
                <h3 className="text-sm md:text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-xs md:text-sm text-gray-500 font-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ──────────────────────────────────────────── */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-black tracking-[0.25em] text-[#25D366] uppercase">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mt-4 mb-5 tracking-tight">
              Simple, transparent pricing.
            </h2>
            <p className="text-gray-500 font-light max-w-lg mx-auto">
              All prices in LKR. No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-[#25D366]/8 to-[#128C7E]/5 border-2 border-[#25D366]/40 shadow-xl shadow-[#25D366]/10'
                    : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#25D366] text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <span className="text-xs font-black tracking-widest text-[#25D366] uppercase">{plan.name}</span>
                  <div className="flex items-baseline gap-1 mt-2 mb-3">
                    {plan.price !== 'Custom' && <span className="text-gray-400 text-lg font-light">Rs.</span>}
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm font-light leading-relaxed">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="#25D366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onOpenAuth('register')}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider transition-all duration-300 cursor-pointer border-none ${
                    plan.highlight
                      ? 'bg-[#25D366] hover:bg-[#22c55e] text-white shadow-lg shadow-[#25D366]/30 hover:scale-[1.02]'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          {/* FAQ Accordion Section */}
          <div className="mt-28 max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                Questions before you start?
              </h3>
              <p className="text-gray-500 font-light text-sm mt-2">
                Here are the answers most pricing-page visitors need before messaging us.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border-b border-gray-100 last:border-none">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <span className="font-bold text-sm md:text-base text-gray-800 tracking-tight pr-4">
                        {faq.question}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#25D366]' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-[200px] border-t border-gray-50/80 bg-gray-50/20' : 'max-h-0'
                      }`}
                    >
                      <div className="px-6 py-5 text-gray-500 text-xs md:text-sm font-light leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#025C4C] via-[#075E54] to-[#0a3d2e] py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,211,102,0.15)_0%,_transparent_70%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Ready to automate your<br />WhatsApp business?
          </h2>
          <p className="text-green-200 font-light text-lg mb-10">
            Join hundreds of Sri Lankan businesses already using AgentBunny to serve customers 24/7.
          </p>
          <button
            onClick={() => onOpenAuth('register')}
            className="group px-12 py-5 bg-white text-[#075E54] font-black text-sm tracking-widest rounded-2xl hover:scale-105 transition-all duration-300 shadow-xl shadow-black/30 cursor-pointer border-none"
          >
            Start Free Today
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </button>
          <p className="text-green-300/60 text-xs mt-5">No credit card required · Cancel anytime</p>
        </div>
      </section>

    </div>
  );
}

export default Home;

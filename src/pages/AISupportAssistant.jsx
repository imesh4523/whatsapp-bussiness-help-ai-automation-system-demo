import React, { useState, useEffect, useRef } from 'react';
import { TAWKTO_PROPERTY_ID, TAWKTO_WIDGET_ID } from '../config';
import { Send, User, Bot, HelpCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function AISupportAssistant({ setTab }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AgentBunny AI Assistant. How can I help you automate your WhatsApp Business workflow today?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTransferred, setIsTransferred] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load and configure Tawk.to widget on mount
  useEffect(() => {
    // 1. Ensure the script is injected
    let script = document.getElementById('tawkto-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'tawkto-script';
      script.async = true;
      script.src = `https://embed.tawk.to/${TAWKTO_PROPERTY_ID}/${TAWKTO_WIDGET_ID}`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      document.body.appendChild(script);
    }

    // 2. Setup Tawk_API callbacks
    window.Tawk_API = window.Tawk_API || {};
    
    // Hide widget by default upon loading
    window.Tawk_API.onLoad = function() {
      if (window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };

    // If agent sends a message from Tawk.to dashboard, detect it
    window.Tawk_API.onChatMessageAgent = function(message) {
      console.log('Agent message detected:', message);
      
      const txt = typeof message === 'string' ? message : (message.text || '');
      
      setMessages((prev) => {
        const next = [...prev];
        // Append Agent Joined system message if not already present
        const hasJoined = prev.some(m => m.sender === 'agent-joined');
        if (!hasJoined) {
          next.push({ sender: 'agent-joined', text: 'Human agent (Aneesa) joined the chat.' });
        }
        next.push({ sender: 'agent', text: txt });
        return next;
      });
      setIsTransferred(true);
    };

    // Hide if already loaded
    if (window.Tawk_API && window.Tawk_API.hideWidget) {
      window.Tawk_API.hideWidget();
    }

    return () => {
      // Hide widget when unmounting (switching tabs)
      if (window.Tawk_API && window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };
  }, []);

  const handleRequestHuman = () => {
    if (!window.Tawk_API || typeof window.Tawk_API.getStatus !== 'function') {
      setMessages(prev => [
        ...prev,
        { sender: 'system', text: 'Live chat widget is currently initializing. Please try again in 5 seconds.' }
      ]);
      return;
    }

    const status = window.Tawk_API.getStatus();
    console.log('Current tawk.to agent status:', status);

    if (status === 'online' || status === 'away') {
      // Agent is online! Transfer to human agent (Aneesa)
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'chat has been tranferd to human agent ( aneesa) hi' }
      ]);
      setIsTransferred(true);
      
      // Show and maximize tawk.to widget so the user can interact
      if (window.Tawk_API.showWidget && window.Tawk_API.maximize) {
        window.Tawk_API.showWidget();
        window.Tawk_API.maximize();
      }
    } else {
      // Agent is offline! Display fallback message and button
      setMessages(prev => [
        ...prev,
        { 
          sender: 'bot', 
          text: 'this time unble to connect live agent please open support ticked',
          isTicketFallback: true
        }
      ]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputValue('');

    // Check if the user is requesting human agent in their text message
    const keywords = ['human', 'agent', 'support', 'person', 'talk to human', 'talk to agent', 'aneesa', 'live support', 'help'];
    const requestsHuman = keywords.some(k => userText.toLowerCase().includes(k));

    if (requestsHuman) {
      setTimeout(() => {
        handleRequestHuman();
      }, 800);
      return;
    }

    // Default AI mock response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `I received your query: "${userText}". Since this is a demo environment, I cannot connect to live servers, but the UI integrations are fully working! If you want to test live chat support, click "Request Human Agent" or type "human" in your message.`
        }
      ]);
    }, 1000);
  };

  const handleOpenTicket = () => {
    // Generate text conversation logs
    const logs = messages
      .filter(m => m.sender === 'user' || m.sender === 'bot')
      .map(m => `${m.sender === 'user' ? 'Customer' : 'AI Assistant'}: ${m.text}`)
      .join('\n');

    // Store log details in sessionStorage to pre-fill the ticket
    sessionStorage.setItem('prefill_ticket_subject', 'Live Chat Support Fallback Request');
    sessionStorage.setItem(
      'prefill_ticket_description',
      `Hi, I attempted to connect with a live support agent, but none were online. My chat context:\n\n${logs}\n\nPlease help me automate my WhatsApp Business workflow.`
    );

    // Switch tab to support ticket page
    setTab('ticket');
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="container-top flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="container-top__left">
          <h5 className="container-top__title font-black text-neutral-800 tracking-tight uppercase">AgentBunny AI Support</h5>
          <p className="container-top__desc text-xs text-neutral-400 font-bold mt-1">
            Ask anything and get answers instantly from our AI Assistant
          </p>
        </div>
        <div className="container-top__right">
          <button
            onClick={handleRequestHuman}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-wider transition-all shadow-md border-none"
          >
            <User className="w-4 h-4" />
            Request Human Agent
          </button>
        </div>
      </div>

      <div className="dashboard-container__body">
        <div 
          className="chat-container border border-gray-100 rounded-3xl bg-white shadow-sm overflow-hidden flex flex-col"
          style={{ height: '480px' }}
        >
          {/* Messages Stream */}
          <div 
            className="chat-messages p-4 flex-grow overflow-y-auto space-y-4"
            style={{ background: '#f8fafc' }}
          >
            {messages.map((msg, index) => {
              if (msg.sender === 'system' || msg.sender === 'agent-joined') {
                return (
                  <div key={index} className="flex justify-center my-2">
                    <span className="bg-neutral-100 text-neutral-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-neutral-200">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              const isAgent = msg.sender === 'agent';

              return (
                <div 
                  key={index} 
                  className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div 
                      className={`rounded-full p-2 flex items-center justify-center text-white ${isAgent ? 'bg-blue-600' : 'bg-[#00832e]'}`} 
                      style={{ width: '36px', height: '36px' }}
                    >
                      {isAgent ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="max-w-[70%] space-y-2">
                    <div 
                      className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed ${
                        isUser 
                          ? 'bg-black text-white rounded-tr-none' 
                          : isAgent 
                            ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none'
                            : 'bg-neutral-50 text-neutral-700 border border-neutral-100 rounded-tl-none'
                      }`}
                    >
                      <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {msg.isTicketFallback && (
                      <div className="pt-1">
                        <button
                          onClick={handleOpenTicket}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#00832e] hover:bg-[#006e26] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm border-none"
                        >
                          Open Support Ticket
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div 
                      className="rounded-full p-2 bg-neutral-200 text-neutral-600 flex items-center justify-center" 
                      style={{ width: '36px', height: '36px' }}
                    >
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area border-t border-gray-100 p-3 bg-white">
            {isTransferred ? (
              <div className="text-center py-2.5 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-blue-600 text-[10.5px] font-bold uppercase tracking-widest">
                Transferred to Live Agent. Please type your replies in the floating widget.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask AI or request a human..."
                  className="flex-grow px-4 py-3 border border-gray-200 rounded-xl focus:border-[#00832e] focus:ring-2 focus:ring-[#00832e]/10 focus:outline-none text-xs font-bold text-neutral-800"
                />
                <button
                  type="submit"
                  className="px-5 rounded-xl bg-[#00832e] text-white hover:bg-[#006e26] transition-all flex items-center justify-center border-none shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

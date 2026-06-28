import React from 'react';

function About() {
  return (
    <div className="animate-fade-in relative z-10 w-full pt-32 pb-32 bg-white">
      
      {/* 1. Header Banner */}
      <div className="max-w-4xl mx-auto px-8 text-center mb-24">
        <span className="text-xs font-black tracking-[0.25em] text-[#25D366] uppercase">Our Story</span>
        <h1 className="text-5xl font-black tracking-tight text-gray-900 mt-3 mb-6">Our Mission.</h1>
        <p className="text-xl text-gray-500 font-light leading-relaxed">
          At AgentBunny, we believe that customer communication should be effortless. Founded in 2026, our mission is to empower local businesses by building conversational AI agents that automate customer queries, catalog orders, and delivery coordination on WhatsApp — 24/7 on autopilot.
        </p>
      </div>

      {/* 2. Philosophy Block 1 */}
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        <div className="rounded-3xl p-1 bg-gray-50 overflow-hidden h-[400px] shadow-sm border border-gray-100">
          <img 
            src="/about-pillar1.jpg" 
            className="w-full h-full object-cover rounded-2xl transition-all duration-700 hover:scale-102"
            alt="AgentBunny conversational AI interfaces and automated chats"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center p-8 md:p-12 rounded-3xl bg-gray-50 border border-gray-100">
          <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">Seamless Conversations</h2>
          <p className="text-gray-500 font-light leading-relaxed mb-6">
            We bridge the gap between structured databases and messaging. AgentBunny acts as a natural sales assistant that understands customer intent, processes questions in Sinhala/Singlish, and showcases products directly within WhatsApp without clunky buttons or menus.
          </p>
          <div className="w-12 h-1 bg-[#25D366] rounded" />
        </div>
      </div>

      {/* 3. Philosophy Block 2 */}
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        <div className="flex flex-col justify-center p-8 md:p-12 rounded-3xl bg-gray-50 border border-gray-100 order-2 md:order-1">
          <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">Enabling Local Growth</h2>
          <p className="text-gray-500 font-light leading-relaxed mb-6">
            Repetitive queries and manual follow-ups consume hours of valuable time. By automating support, inventory checks, and checkout steps, we help small and medium business owners reclaim their time and scale their operations seamlessly.
          </p>
          <div className="w-12 h-1 bg-[#25D366] rounded" />
        </div>
        <div className="rounded-3xl p-1 bg-gray-50 overflow-hidden h-[400px] order-1 md:order-2 shadow-sm border border-gray-100">
          <img 
            src="/about-pillar2.jpg" 
            className="w-full h-full object-cover rounded-2xl transition-all duration-700 hover:scale-102"
            alt="Business automation packages logistics and analytics charts"
            loading="lazy"
          />
        </div>
      </div>

      {/* 4. Lower CTA Section */}
      <div className="text-center py-20 px-8 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#075E54] rounded-3xl max-w-5xl mx-auto text-white shadow-xl relative overflow-hidden">
        <h2 className="text-3xl font-black tracking-tight mb-6">Ready to Automate Your Store?</h2>
        <p className="text-green-100 font-light mb-8 max-w-md mx-auto text-sm md:text-base">
          Join hundreds of local businesses using AgentBunny to handle orders and convert WhatsApp chats to sales 24/7.
        </p>
        <div className="flex justify-center gap-6">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3.5 bg-white text-[#075E54] font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-gray-100 transition-all shadow-md cursor-pointer border-none"
          >
            Go to Home
          </button>
        </div>
      </div>

    </div>
  );
}

export default About;

import React, { useState, useEffect } from 'react';

function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner only if the user hasn't made a choice yet
    const choice = localStorage.getItem('aura_cookie_pref');
    if (!choice) {
      // Delay visibility slightly for a premium entrance transition
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = (choice) => {
    localStorage.setItem('aura_cookie_pref', choice);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-40 glass-panel rounded-3xl p-6 shadow-2xl border border-white/60 animate-slide-up">
      <h3 className="text-sm font-bold tracking-tight text-neutral-900 mb-2">
        Privacy Preference
      </h3>
      <p className="text-gray-500 font-light text-xs leading-relaxed mb-5">
        We use cookies to enhance your cinematic shopping experience and analyze our traffic. By clicking &ldquo;Accept&rdquo;, you consent to our use of cookies.
      </p>
      <div className="flex gap-3 justify-end">
        <button 
          onClick={() => handleChoice('decline')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:border-gray-400 text-[10px] font-bold tracking-widest uppercase transition-colors"
        >
          Decline
        </button>
        <button 
          onClick={() => handleChoice('accept')}
          className="px-6 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-[10px] font-bold tracking-widest uppercase transition-colors"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}

export default CookieBanner;

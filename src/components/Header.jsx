import React, { useState } from 'react';

function Header({ cartCount, onOpenCart, user, onLogout, onOpenAuth, currentView, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-5">
      <div className="glass-panel max-w-7xl mx-auto rounded-full flex justify-between items-center px-6 md:px-8 py-3 bg-white/40 backdrop-blur-md border border-white/60">
        
        {/* Brand Logo */}
        <button 
          onClick={() => onNavigate('home')} 
          className="text-2xl font-black tracking-tighter text-black hover:opacity-70 transition-opacity"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-3xl leading-none">🐰</span>
            <span>AgentBunny.</span>
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex gap-8 text-xs font-bold tracking-widest uppercase">
          <button 
            onClick={() => onNavigate('features')} 
            className={`transition-colors hover:text-black ${
              currentView === 'features' ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-500'
            }`}
          >
            Features
          </button>
          <button 
            onClick={() => onNavigate('pricing')} 
            className={`transition-colors hover:text-black flex items-center gap-1 ${
              currentView === 'pricing' ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-500'
            }`}
          >
            Pricing
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          </button>
          <button 
            onClick={() => onNavigate('about')} 
            className={`transition-colors hover:text-black ${
              currentView === 'about' ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-500'
            }`}
          >
            About
          </button>
        </nav>

        {/* Right Section Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Sign In Button */}
          <button 
            className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-black/5 rounded-full transition-all"
            onClick={() => user ? onNavigate('account') : onOpenAuth('login')}
          >
            <span className="text-xs font-bold tracking-widest uppercase">
              {user ? 'ACCOUNT' : 'SIGN IN'}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
              user ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {user ? user.name[0].toUpperCase() : '?'}
            </div>
          </button>

          {/* Cart Button */}
          <button 
            className="navbar-cart-btn flex items-center gap-2 hover:opacity-70 transition-opacity relative group" 
            onClick={onOpenCart} 
            aria-label="Open cart"
          >
            <span className="text-sm font-bold tracking-widest uppercase hidden md:inline-block">CART</span>
            <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <div className="bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
              {cartCount}
            </div>
          </button>

          {/* Mobile Profile Icon */}
          <button 
            onClick={() => user ? onNavigate('account') : onOpenAuth('login')} 
            className="sm:hidden w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden"
          >
            {user ? (
              <span className="text-[10px] font-black">{user.name[0].toUpperCase()}</span>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>

          {/* Hamburger menu trigger */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="md:hidden opacity-70 hover:opacity-100 pl-2 border-l border-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div className={`md:hidden fixed inset-0 z-50 transition-all duration-500 ease-in-out ${
        menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setMenuOpen(false)}></div>
        <div className={`absolute top-0 right-0 bottom-0 w-[80%] bg-white p-8 flex flex-col justify-between transform transition-transform duration-500 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex flex-col gap-6 mt-12 text-lg font-bold tracking-widest uppercase">
            <button 
              onClick={() => { setMenuOpen(false); onNavigate('features'); }} 
              className="text-left py-2 border-b border-gray-100 hover:text-black"
            >
              Features
            </button>
            <button 
              onClick={() => { setMenuOpen(false); onNavigate('pricing'); }} 
              className="text-left py-2 border-b border-gray-100 flex justify-between items-center hover:text-black"
            >
              Pricing
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            </button>
            <button 
              onClick={() => { setMenuOpen(false); onNavigate('about'); }} 
              className="text-left py-2 border-b border-gray-100 hover:text-black"
            >
              About
            </button>
          </div>
          <div className="text-center text-xs tracking-widest text-gray-400 uppercase border-t border-gray-100 pt-6">
            © 2026 AgentBunny
          </div>
        </div>
      </div>

    </header>
  );
}

export default Header;

import React from 'react';
import { Instagram, Facebook, Twitter, Mail, ArrowUpRight } from 'lucide-react';

function Footer({ onNavigate }) {
  return (
    <footer className="bg-white border-t border-gray-100 mt-20 pt-16 pb-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        
        {/* Brand Column */}
        <div className="md:col-span-2">
          <span className="flex items-center gap-1.5">
            <span className="text-3xl leading-none">🐰</span>
            <span>AgentBunny.</span>
          </span>
          <p className="text-gray-500 font-light max-w-sm mb-6 leading-relaxed">
            WhatsApp AI Sales Agents and automation systems for growing local businesses. Engage customers, check stock, and collect orders on autopilot.
          </p>
          <div className="flex items-center gap-4 text-gray-400">
            <a href="https://instagram.com" className="hover:text-black transition-colors" target="_blank" rel="noreferrer">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://facebook.com" className="hover:text-black transition-colors" target="_blank" rel="noreferrer">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="https://twitter.com" className="hover:text-black transition-colors" target="_blank" rel="noreferrer">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Links Columns */}
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">SaaS Platform</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li onClick={() => onNavigate('features')} className="hover:text-black transition-colors cursor-pointer">Features</li>
            <li onClick={() => onNavigate('pricing')} className="hover:text-black transition-colors cursor-pointer">Pricing Plans</li>
            <li onClick={() => onNavigate('about')} className="hover:text-black transition-colors cursor-pointer">About Us</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Support</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="hover:text-black transition-colors cursor-pointer">User Guide</li>
            <li className="hover:text-black transition-colors cursor-pointer">FAQ</li>
            <li onClick={() => onNavigate('terms')} className="hover:text-black transition-colors cursor-pointer">Terms of Service</li>
            <li onClick={() => onNavigate('privacy')} className="hover:text-black transition-colors cursor-pointer">Privacy Policy</li>
            <li>
              <a 
                href="mailto:hello@agent-bunny.com" 
                className="hover:text-black transition-colors flex items-center gap-1"
              >
                hello@agent-bunny.com
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">
        <div>© 2026 AgentBunny. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <span className="hover:text-black transition-colors cursor-pointer">Terms of Use</span>
          <span className="hover:text-black transition-colors cursor-pointer">Privacy Policy</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

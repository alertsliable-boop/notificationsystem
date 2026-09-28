'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Menu, X } from 'lucide-react';

export default function HomeNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(10, 37, 64, 0.96)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="Liable Alerts home">
          <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center shadow-sm">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg text-white">Liable Alerts</span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium text-blue-200 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium text-blue-200 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            id="navbar-cta-start-trial"
            className="text-[13px] font-bold text-white px-5 py-2 rounded-full transition-all hover:opacity-90 shadow-md"
            style={{ backgroundColor: '#f97316' }}
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-1 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 md:hidden focus:outline-none transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-white/10 px-5 py-4 space-y-3 shadow-xl"
          style={{ backgroundColor: 'rgba(10, 37, 64, 0.98)' }}
        >
          <div className="flex flex-col space-y-1 pb-3 border-b border-white/10">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-blue-200 hover:text-white py-2.5 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:text-white border border-white/15 hover:bg-white/10 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: '#f97316' }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

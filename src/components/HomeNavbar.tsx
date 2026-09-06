'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Menu, X } from 'lucide-react';

export default function HomeNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFD]/90 backdrop-blur-xl border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="font-bold tracking-tight text-lg text-[#111827]">Liable Alerts</span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium text-[#4B5563] hover:text-black transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium text-[#4B5563] hover:text-black transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-[13px] font-semibold bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-full transition-all shadow-sm"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-1 rounded-xl text-gray-700 hover:text-black hover:bg-gray-100 md:hidden focus:outline-none"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5E7EB] bg-[#FDFDFD] px-5 py-4 space-y-3 animate-slideDown shadow-lg">
          <div className="flex flex-col space-y-2 pb-3 border-b border-gray-100">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#4B5563] hover:text-black py-2 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 transition-all shadow-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

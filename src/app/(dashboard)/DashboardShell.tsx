'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X, Mail } from 'lucide-react';
import { MainSidebarNav, SettingsSidebarNav } from './SidebarNav';
import SignOutButton from '@/components/SignOutButton';
import PageTransition from '@/components/PageTransition';

interface DashboardShellProps {
  companyName: string;
  userName: string;
  userEmail: string;
  subscription: any;
  activeCount: number;
  maxEndpoints: number;
  usagePct: number;
  children: React.ReactNode;
}

export default function DashboardShell({
  companyName,
  userName,
  userEmail,
  subscription,
  activeCount,
  maxEndpoints,
  usagePct,
  children,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Responsive Drawer on Mobile, Fixed Aside on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-white flex flex-col flex-shrink-0 border-r border-gray-100 shadow-xl lg:shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Close Button */}
        <div className="h-16 px-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Zap className="w-4.5 h-4.5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-gray-900 block leading-tight tracking-tight">Liable Alerts</span>
              <span className="text-[11px] text-gray-400 truncate max-w-[130px] block">{companyName || 'Workspace'}</span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Main</p>
            <MainSidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Settings</p>
            <SettingsSidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </nav>

        {/* Usage Widget */}
        {subscription && (
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3.5 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Plan Usage</span>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                  {subscription.plan?.name || 'Trial'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-bold text-gray-900">{activeCount}</span>
                <span className="text-[11px] text-gray-500">/ {maxEndpoints} endpoints</span>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <Link
                href="/billing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-2.5 inline-flex items-center gap-1"
              >
                Manage Plan →
              </Link>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-gray-900">{userName}</p>
              <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden overscroll-none">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900 truncate">
                {companyName || 'Workspace'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-gray-400 hidden xs:block">
                Email-to-SMS Alert Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-100 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
              <span className="text-[11px] font-semibold text-green-700">Live</span>
            </div>
            <Link
              href="/endpoints/new"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-[13px] rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">New Endpoint</span>
              <span className="xs:hidden">New</span>
            </Link>
          </div>
        </header>

        {/* Responsive Content Container */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1280px] mx-auto w-full">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}

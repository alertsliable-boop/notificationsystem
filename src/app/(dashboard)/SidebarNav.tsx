'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, Mail, Users, Bell, Settings, 
  CreditCard, ClipboardList, MapPin, Phone, ShieldCheck, 
  ChevronDown, ChevronRight, Zap, Plus, MessageSquare, FileText,
  type LucideIcon 
} from 'lucide-react';

interface SubNavItem {
  label: string;
  href: string;
  tabKey: string;
  icon: LucideIcon;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  subItems?: SubNavItem[];
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Email Endpoints', href: '/endpoints', icon: Mail },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Recipients', href: '/recipients', icon: Phone },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Sites', href: '/sites', icon: MapPin },
];

const billingSubItems: SubNavItem[] = [
  { label: 'Subscription Plans', href: '/billing?tab=plans', tabKey: 'plans', icon: Zap },
  { label: 'Saved Payment Card', href: '/billing?tab=payment-method', tabKey: 'payment-method', icon: CreditCard },
  { label: 'Additional Endpoints', href: '/billing?tab=endpoints', tabKey: 'endpoints', icon: Plus },
  { label: 'SMS Credits & Limits', href: '/billing?tab=sms', tabKey: 'sms', icon: MessageSquare },
  { label: 'Invoices & Receipts', href: '/billing?tab=invoices', tabKey: 'invoices', icon: FileText },
];

const settingsNavItems: NavItem[] = [
  { 
    label: 'Billing & Plans', 
    href: '/billing', 
    icon: CreditCard,
    subItems: billingSubItems,
  },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Audit Logs', href: '/audit', icon: ClipboardList },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNavItems: NavItem[] = [
  { label: 'Admin Portal', href: '/admin', icon: ShieldCheck },
];

function SidebarNavListInternal({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'plans';

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    '/billing': true,
  });

  const toggleExpand = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isItemActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
        const isExpanded = expandedItems[item.href] ?? isItemActive;

        return (
          <div key={item.href} className="space-y-0.5">
            <div className="flex items-center">
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[13px] font-medium group ${
                  isItemActive && !hasSubItems
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : isItemActive
                    ? 'text-blue-700 font-semibold bg-blue-50/60'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isItemActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>

              {hasSubItems && (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(item.href, e)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition mr-1 cursor-pointer"
                  aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Sub Items (e.g. for Billing & Plans) */}
            {hasSubItems && isExpanded && item.subItems && (
              <div className="ml-5 pl-2.5 my-1 border-l-2 border-blue-100 space-y-0.5 animate-fadeIn">
                {item.subItems.map((sub) => {
                  const isSubActive = isItemActive && currentTab === sub.tabKey;
                  const SubIcon = sub.icon;

                  return (
                    <Link
                      key={sub.tabKey}
                      href={sub.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSubActive
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="truncate">{sub.label}</span>
                      {isSubActive && <span className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MainSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<div className="h-20" />}>
      <SidebarNavListInternal items={mainNavItems} onNavigate={onNavigate} />
    </Suspense>
  );
}

export function SettingsSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<div className="h-20" />}>
      <SidebarNavListInternal items={settingsNavItems} onNavigate={onNavigate} />
    </Suspense>
  );
}

export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<div className="h-20" />}>
      <SidebarNavListInternal items={adminNavItems} onNavigate={onNavigate} />
    </Suspense>
  );
}

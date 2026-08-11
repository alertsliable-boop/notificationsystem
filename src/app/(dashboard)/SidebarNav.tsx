'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Mail, Users, Bell, Settings, 
  CreditCard, ClipboardList, MapPin, Phone, type LucideIcon 
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Email Endpoints', href: '/endpoints', icon: Mail },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Recipients', href: '/recipients', icon: Phone },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Sites', href: '/sites', icon: MapPin },
];

const settingsNavItems: NavItem[] = [
  { label: 'Billing & Plans', href: '/billing', icon: CreditCard },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Audit Logs', href: '/audit', icon: ClipboardList },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function SidebarNavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              }`}
            />
            {item.label}
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function MainSidebarNav() {
  return <SidebarNavList items={mainNavItems} />;
}

export function SettingsSidebarNav() {
  return <SidebarNavList items={settingsNavItems} />;
}

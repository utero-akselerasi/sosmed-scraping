'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  TrendingUp,
  Hash,
  Settings,
  Globe,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Posts', href: '/dashboard/posts', icon: FileText },
  { name: 'Influencers', href: '/dashboard/influencers', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Platforms', href: '/dashboard/platforms', icon: Globe },
  { name: 'Keywords', href: '/dashboard/keywords', icon: Hash },
  { name: 'Users', href: '/dashboard/users', icon: UserCircle, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Festival Mbois</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}

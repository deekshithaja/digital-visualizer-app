import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Network,
  Radar,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/map', label: 'Exposure Map', icon: Network },
  { to: '/targets', label: 'My Assets', icon: Radar },
  { to: '/actions', label: 'Checklist', icon: CheckSquare },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [imgError, setImgError] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#172641] dark:bg-[#101B32] border-r border-[#263653] dark:border-[#263653]">
      <div>
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#263653] dark:border-[#263653]">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 text-[#F4F7FF] dark:text-[#F4F7FF] whitespace-nowrap shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight">
              Digital Footprint
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-[#A9B7CE] hover:bg-slate-100 dark:hover:bg-[#172641] cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-950/40 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-[#A9B7CE] hover:bg-slate-100 hover:text-[#F4F7FF] dark:text-[#A9B7CE] dark:hover:bg-[#172641]/70 dark:hover:text-[#F4F7FF]'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-[#263653] dark:border-[#263653] p-4">
        <div className="flex items-center gap-3">
          {user?.avatarUrl && !imgError ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-9 w-9 rounded-lg object-cover border border-[#263653] dark:border-[#263653] shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#172641] text-[#A9B7CE] dark:text-[#F4F7FF] shrink-0">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">
              {user?.fullName || 'Account Owner'}
            </p>
            <p className="truncate text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
              {user?.email || ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#263653] dark:border-[#263653] px-3 py-2 text-xs font-medium text-[#F4F7FF] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#050F20]/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}

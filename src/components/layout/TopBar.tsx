import { Menu, Moon, Plus, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenAddTarget: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/map': 'Exposure Map',
  '/targets': 'My Assets',
  '/actions': 'Checklist',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function TopBar({ onOpenMobileMenu, onOpenAddTarget }: TopBarProps) {
  const { pathname } = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const currentTitle = ROUTE_TITLES[pathname] || 'Overview';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#263653] dark:border-[#263653] bg-[#172641]/95 dark:bg-[#101B32]/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden rounded-lg p-2 text-[#A9B7CE] hover:bg-slate-100 dark:text-[#F4F7FF] dark:hover:bg-[#172641] cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-base sm:text-lg font-semibold text-[#F4F7FF] dark:text-[#F4F7FF] truncate">
          {currentTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#263653] dark:border-[#263653] text-[#A9B7CE] dark:text-[#F4F7FF] hover:bg-slate-100 dark:hover:bg-[#172641] transition-colors cursor-pointer"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenAddTarget}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Asset</span>
        </button>
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AddTargetModal } from '../modals/AddTargetModal';

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addTargetOpen, setAddTargetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex min-h-screen bg-[#050F20] dark:bg-[#050F20] text-[#F4F7FF] dark:text-[#F4F7FF]">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAddTarget={() => setAddTargetOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshKey, triggerRefresh: () => setRefreshKey((k) => k + 1), openAddTarget: () => setAddTargetOpen(true) }} />
        </main>
      </div>

      <AddTargetModal
        open={addTargetOpen}
        onClose={() => setAddTargetOpen(false)}
        onCreated={() => {
          setAddTargetOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

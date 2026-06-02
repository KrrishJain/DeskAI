/**
 * components/layout/AppLayout.jsx
 * Shell layout: Sidebar + Header + Content area.
 */

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import clsx from 'clsx';

export default function AppLayout() {
  const [mini, setMini] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isChatbotRoute = location.pathname === '/chatbot';

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        mini={mini}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
        mini={mini}
        onToggleMini={() => setMini((v) => !v)}
        onMobileMenu={() => setMobileOpen(true)}
      />

      {/* Main content area shifts with sidebar */}
      <main
        className={clsx(
          'pt-16 min-h-screen transition-[padding-left] duration-[220ms]',
          mini ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        <div
          className={clsx(
            'mx-auto',
            isChatbotRoute
              ? 'h-[calc(100vh-4rem)] min-h-0 max-w-[1600px] overflow-hidden p-3 lg:p-4'
              : 'max-w-[1600px] p-5 lg:p-7'
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
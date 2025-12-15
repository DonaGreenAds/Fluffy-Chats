'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Check if we're on an auth page
  const isAuthPage = pathname.startsWith('/auth');

  // Auth pages don't need sidebar or protection
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Protected pages with sidebar
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[var(--background)]">
        <Sidebar />
        <main key={pathname} className="flex-1 ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

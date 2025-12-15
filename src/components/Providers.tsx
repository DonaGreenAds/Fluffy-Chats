'use client';

import { AuthProvider } from '@/context/AuthContext';
import { LeadProvider } from '@/context/LeadContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LeadProvider>
        {children}
      </LeadProvider>
    </AuthProvider>
  );
}

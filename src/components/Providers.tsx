'use client';

import { SessionProvider } from 'next-auth/react';
import InactivityTracker from './InactivityTracker';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivityTracker />
      {children}
    </SessionProvider>
  );
}


'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';

interface RealtimeAutoRefresherProps {
  intervalMs?: number;
  companyId?: string;
  enablePolling?: boolean;
}

export default function RealtimeAutoRefresher({
  intervalMs = 6000,
  companyId,
  enablePolling = true,
}: RealtimeAutoRefresherProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    // 1. Setup Supabase Realtime channel if available
    let channel: any = null;
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        channel = supabase
          .channel('realtime_alerts_sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Notification' },
            () => {
              const now = Date.now();
              if (now - lastRefreshRef.current > 1500) {
                lastRefreshRef.current = now;
                router.refresh();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'SmsMessage' },
            () => {
              const now = Date.now();
              if (now - lastRefreshRef.current > 1500) {
                lastRefreshRef.current = now;
                router.refresh();
              }
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription not initialized, falling back to interval refresh:', e);
    }

    // 2. Active Tab Interval Polling
    let timer: NodeJS.Timeout | null = null;
    if (enablePolling) {
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const now = Date.now();
          if (now - lastRefreshRef.current >= intervalMs - 500) {
            lastRefreshRef.current = now;
            router.refresh();
          }
        }
      }, intervalMs);
    }

    // 3. Visibility Change Refresh (when returning to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastRefreshRef.current > 3000) {
          lastRefreshRef.current = now;
          router.refresh();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) {
        try {
          const supabase = getSupabaseBrowserClient();
          supabase?.removeChannel(channel);
        } catch {}
      }
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, intervalMs, companyId, enablePolling]);

  return null;
}

export { RealtimeAutoRefresher };

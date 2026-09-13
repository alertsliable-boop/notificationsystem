'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// 5 minutes total inactivity allowed (in milliseconds)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
// Show warning dialog 30 seconds before logout
const WARNING_THRESHOLD_MS = 30 * 1000;
const STORAGE_KEY = 'liable_last_activity_ts';

export default function InactivityTracker() {
  const { status } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const lastActivityRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Trigger logout
  const handleLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      localStorage.removeItem(STORAGE_KEY);
      await signOut({ redirect: true, callbackUrl: '/login?reason=inactivity' });
    } catch {
      window.location.href = '/login?reason=inactivity';
    }
  }, []);

  // Record user activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Reset warning if user interacted
    setShowWarning(false);

    // Throttle writing to localStorage to once every 2 seconds
    if (now - lastSaveRef.current > 2000) {
      lastSaveRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
      } catch {}
    }
  }, []);

  // Listen to multi-tab activity sync via storage event
  useEffect(() => {
    if (status !== 'authenticated') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          setShowWarning(false);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [status]);

  // Activity listeners
  useEffect(() => {
    if (status !== 'authenticated') return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];

    const onEvent = () => recordActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, onEvent, { passive: true });
    });

    // Check on visibility change or tab focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stored = localStorage.getItem(STORAGE_KEY);
        const latestTime = stored ? parseInt(stored, 10) : lastActivityRef.current;
        const elapsed = Date.now() - (isNaN(latestTime) ? lastActivityRef.current : latestTime);
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          handleLogout();
        } else {
          recordActivity();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    // Initialize local timestamp
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}

    // Inactivity ticker running every 1 second
    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsedStored = stored ? parseInt(stored, 10) : null;
      const last = parsedStored && !isNaN(parsedStored) ? Math.max(lastActivityRef.current, parsedStored) : lastActivityRef.current;

      const elapsed = Date.now() - last;
      const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;

      if (remainingMs <= 0) {
        clearInterval(interval);
        handleLogout();
      } else if (remainingMs <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onEvent));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
      clearInterval(interval);
    };
  }, [status, recordActivity, handleLogout]);

  if (status !== 'authenticated' || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-amber-200 text-center space-y-4 animate-scaleUp">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900">Session Inactivity Warning</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            For security reasons, your account will be automatically signed out due to inactivity in:
          </p>
        </div>

        <div className="py-2">
          <span className="text-3xl font-extrabold text-amber-600 font-mono tracking-wider bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-xl inline-block">
            00:{String(secondsRemaining).padStart(2, '0')}
          </span>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={recordActivity}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Stay Signed In
          </Button>
          <Button
            variant="outline"
            className="w-full justify-center text-gray-500 hover:text-gray-700"
            onClick={handleLogout}
            icon={<LogOut className="w-4 h-4" />}
          >
            Sign Out Now
          </Button>
        </div>
      </div>
    </div>
  );
}

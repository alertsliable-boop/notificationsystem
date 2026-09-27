'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockHeaderProps {
  timezone?: string | null;
  className?: string;
  showTime?: boolean;
}

export default function LiveClockHeader({
  timezone,
  className = '',
  showTime = false,
}: LiveClockHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

      try {
        const datePart = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(now);

        if (showTime) {
          const timePart = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          }).format(now);
          setTimeStr(`${datePart} • ${timePart}`);
        } else {
          // Show short timezone code
          const tzCode = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'short',
          }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
          setTimeStr(`${datePart}${tzCode ? ` (${tzCode})` : ''}`);
        }
      } catch (err) {
        setTimeStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [timezone, showTime]);

  if (!mounted) {
    return (
      <div className={`hidden md:flex items-center gap-2 text-[12px] text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-2xs ${className}`}>
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        <span>Loading date…</span>
      </div>
    );
  }

  return (
    <div className={`hidden md:flex items-center gap-2 text-[12px] font-medium text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-2xs ${className}`}>
      <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
      <span>{timeStr}</span>
    </div>
  );
}

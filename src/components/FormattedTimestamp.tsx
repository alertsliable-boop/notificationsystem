'use client';

import { useState, useEffect } from 'react';

interface FormattedTimestampProps {
  isoString: string;
  timezone?: string | null;
  mode?: 'time' | 'datetime' | 'date';
  className?: string;
}

export default function FormattedTimestamp({
  isoString,
  timezone,
  mode = 'time',
  className = '',
}: FormattedTimestampProps) {
  const [mounted, setMounted] = useState(false);
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setMounted(true);
    const date = new Date(isoString);
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

    try {
      if (mode === 'datetime') {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(date);
        setFormatted(str);
      } else if (mode === 'date') {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(date);
        setFormatted(str);
      } else {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(date);
        setFormatted(str);
      }
    } catch {
      setFormatted(new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isoString, timezone, mode]);

  if (!mounted) {
    // Basic fallback before hydration
    return <span className={className}>…</span>;
  }

  return <span className={className}>{formatted}</span>;
}

export { FormattedTimestamp };

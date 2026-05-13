'use client';

import { useEffect, useState } from 'react';

export function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string, onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        if (onExpire && !isExpired) {
           onExpire();
        }
        return 0;
      }
      return Math.floor(diff / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire, isExpired]);

  if (isExpired) {
    return <span className="text-red-600 font-bold font-mono">00:00</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const isDanger = timeLeft < 120; // less than 2 minutes

  return (
    <span className={`font-mono font-bold ${isDanger ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-200'}`}>
      {formatted}
    </span>
  );
}

import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          if (isMounted) {
            wakeLock.current = lock;
          } else {
            lock.release();
          }
        } catch (err) {
          console.error('Wake Lock error:', err);
        }
      }
    };
    
    requestWakeLock();

    return () => {
      isMounted = false;
      if (wakeLock.current !== null) {
        wakeLock.current.release().catch(console.error);
        wakeLock.current = null;
      }
    };
  }, []);
}

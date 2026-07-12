import { useEffect } from 'react';
export function MissingCleanup() {
  useEffect(() => { window.addEventListener('resize', () => undefined); }, []);
  return null;
}

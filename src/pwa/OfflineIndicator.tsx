import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={16} />
      <span>Offline-läge — Ändringar sparas lokalt och synkas när du ansluter igen.</span>
    </div>
  );
};

import React from 'react';
import { getLiveStatus, liveStatusStyles } from '../../utils/liveStatus';

export default function LiveStatusBadge({ data, className = '' }) {
  const status = getLiveStatus(data);
  const styles = liveStatusStyles(status.tone);

  return (
    <div
      className={`flex items-center gap-2 text-xs ${styles.text} ${className}`}
      title={status.detail}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
      <span className="font-semibold">{status.label}</span>
      {status.tone === 'live' && (
        <span className="text-sk-ink-muted font-normal hidden sm:inline">
          · {status.detail.replace('Last MQTT · ', '')}
        </span>
      )}
    </div>
  );
}

'use client';

import React from 'react';

const ICON_PATHS: Record<string, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  apartment: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2"/>',
  group: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  groups: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  account_balance_wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h3M6 5V3h13"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 2-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-3v-.09A1.65 1.65 0 0 0 10.9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2-2 .06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 5.9 15H5v-3h.9a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-2 .06.06a1.65 1.65 0 0 0 1.82.33A1.65 1.65 0 0 0 12 5.9V5h3v.9a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2 2-.06.06a1.65 1.65 0 0 0-.33 1.82A1.65 1.65 0 0 0 21 12h.1v3H21a1.65 1.65 0 0 0-1.6 0Z" transform="translate(-1 -1)"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 5M20 4v7h-7"/>',
  chevron_right: '<path d="m9 18 6-6-6-6"/>',
  event_available: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-12 6 2 2 4-4"/>',
  payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h5"/>',
  account_balance: '<path d="m3 10 9-7 9 7M3 10h18M5 10v9m5-9v9m4-9v9m5-9v9M3 21h18"/>',
  local_parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  pending_actions: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M12 13v3l2 1"/>',
  check_circle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5 18.5 18.5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  store: '<path d="M3 9V5h18v4M4 10l2-5m12 0 2 5M5 10v11h14V10M9 21v-8h6v8"/>',
  admin_panel_settings: '<path d="m12 3 8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z"/><path d="M9 12h6m-3-3v6"/>',
  receipt_long: '<path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3Z"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',
  schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  directions_car: '<path d="m5 12 2-7h10l2 7M5 12h14v7H5v-7ZM7 19v2m10-2v2M7 15h2m6 0h2"/>',
  qr_code: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zm7 0v3m-4 4h4m-7-1v1"/>',
  price_change: '<path d="M4 4h16v16H4zM8 9h8m-8 4h8m-4-7v11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  sync: '<path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5m-4 9a8 8 0 0 0 14 2l3-3m0 5v-5h-5"/>',
  analytics: '<path d="M3 3v18h18M7 15l4-4 3 2 5-7"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'
};

interface IconProps {
  name: string;
  className?: string;
  sizeClass?: string;
}

export function Icon({ name, className = '', sizeClass = 'h-5 w-5' }: IconProps) {
  const pathMarkup = ICON_PATHS[name] || ICON_PATHS.info;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center align-middle ${className}`}
      aria-label={name.replaceAll('_', ' ')}
      data-svg-icon={name}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`block shrink-0 ${sizeClass}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: pathMarkup }}
      />
    </span>
  );
}

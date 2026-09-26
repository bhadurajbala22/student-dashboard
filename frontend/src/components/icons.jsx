/** Hand-rolled icon set — no icon dependency. */
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

const S = ({ children, size = 18, className = '', ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} {...rest}>
    {children}
  </svg>
)

export const Icon = {
  Grid: (p) => <S {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></S>,
  Search: (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>,
  Calendar: (p) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></S>,
  Clock: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></S>,
  Video: (p) => <S {...p}><rect x="2.5" y="6" width="13" height="12" rx="3" /><path d="m16 11 5-3v8l-5-3z" /></S>,
  Chat: (p) => <S {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /></S>,
  User: (p) => <S {...p}><circle cx="12" cy="8.5" r="3.75" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></S>,
  Users: (p) => <S {...p}><circle cx="9" cy="8.5" r="3.4" /><path d="M2.5 19.5a6.6 6.6 0 0 1 13 0" /><path d="M16.5 5.6a3.4 3.4 0 0 1 0 6.6M18 19.5a6.6 6.6 0 0 0-1.6-4.3" /></S>,
  Bell: (p) => <S {...p}><path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15z" /><path d="M9.5 21a2.6 2.6 0 0 0 5 0" /></S>,
  Check: (p) => <S {...p}><path d="m5 12.5 4.5 4.5L19 7" /></S>,
  X: (p) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>,
  Plus: (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  Minus: (p) => <S {...p}><path d="M5 12h14" /></S>,
  Star: ({ filled, size = 16, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />
    </svg>
  ),
  Rupee: (p) => <S {...p}><path d="M7 4h10M7 9h10M16 4c0 4-3.4 5-6.5 5H8l6.5 10" /></S>,
  Play: (p) => <S {...p}><path d="M8 5.5v13l10-6.5z" /></S>,
  Pause: (p) => <S {...p}><path d="M9 5v14M15 5v14" /></S>,
  Download: (p) => <S {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M4.5 19.5h15" /></S>,
  Upload: (p) => <S {...p}><path d="M12 20V9m0 0 4 4m-4-4-4 4M4.5 4.5h15" /></S>,
  Archive: (p) => <S {...p}><rect x="3" y="4.5" width="18" height="4.5" rx="1.6" /><path d="M5 9v10a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9M10 13h4" /></S>,
  Trash: (p) => <S {...p}><path d="M4.5 7h15M9.5 7V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V7M6.5 7l.8 12.2A1.6 1.6 0 0 0 8.9 20.7h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" /></S>,
  Logout: (p) => <S {...p}><path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15M11 8l-4 4 4 4M7 12h10" /></S>,
  Book: (p) => <S {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z" /></S>,
  Shield: (p) => <S {...p}><path d="M12 3.2 5 5.8v5.6c0 4.2 2.8 7.6 7 9.4 4.2-1.8 7-5.2 7-9.4V5.8z" /><path d="m9 12 2.2 2.2L15.5 10" /></S>,
  Lock: (p) => <S {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></S>,
  Sparkle: (p) => <S {...p}><path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" /></S>,
  Trend: (p) => <S {...p}><path d="M4 17.5 9.5 12l3.5 3.5L20 8" /><path d="M15.5 8H20v4.5" /></S>,
  Filter: (p) => <S {...p}><path d="M4 6.5h16M7 12h10M10 17.5h4" /></S>,
  Send: (p) => <S {...p}><path d="M4.5 12 20 4.5 15 20l-3.6-6.4z" /><path d="m11.4 13.6 8.6-9.1" /></S>,
  Link: (p) => <S {...p}><path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.5 1.5" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5L12.5 17" /></S>,
  Chevron: (p) => <S {...p}><path d="m9 6 6 6-6 6" /></S>,
  ChevronDown: (p) => <S {...p}><path d="m6 9 6 6 6-6" /></S>,
  Info: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.4" /></S>,
  Alert: (p) => <S {...p}><path d="M12 4.5 21 19.5H3z" /><path d="M12 10v4M12 16.8v.4" /></S>,
  Cap: (p) => <S {...p}><path d="M2.5 9 12 5l9.5 4-9.5 4z" /><path d="M6.5 11v4.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V11M20 10v5" /></S>,
  Menu: (p) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>,
  Wallet: (p) => <S {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16.5 14.5h1.5" /></S>,
  Scale: (p) => <S {...p}><path d="M12 4v16M7 20h10M12 6.5 5 9m7-2.5L19 9" /><path d="M2.5 9h5l-2.5 5zM16.5 9h5l-2.5 5z" /></S>,
  File: (p) => <S {...p}><path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z" /><path d="M14 3.5V7.5h4M9 13h6M9 16.5h4" /></S>,
  Pdf: (p) => <S {...p}><path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z" /><path d="M14 3.5V7.5h4" /><path d="M8.6 16.5v-3h1a.9.9 0 0 1 0 1.8h-1M12.5 16.5v-3h.8a1.5 1.5 0 0 1 0 3zM16.2 16.5v-3h1.6M16.2 15h1.2" /></S>,
  Incognito: (p) => <S {...p}><path d="M4 11.5h16M8 11.5 9.2 6.8A1.5 1.5 0 0 1 10.7 5.7h2.6a1.5 1.5 0 0 1 1.5 1.1L16 11.5" /><circle cx="7.5" cy="15.5" r="2.8" /><circle cx="16.5" cy="15.5" r="2.8" /><path d="M10.3 15.5h3.4" /></S>,
  Board: (p) => <S {...p}><rect x="3" y="4" width="18" height="12.5" rx="2.5" /><path d="M12 16.5V21M8.5 21h7M7.5 8.5h6M7.5 12h3.5" /></S>,
  Package: (p) => <S {...p}><path d="M12 3 3.5 7v10L12 21l8.5-4V7z" /><path d="M3.5 7 12 11l8.5-4M12 11v10" /></S>,
  Refresh: (p) => <S {...p}><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4.5V10h-5.5" /></S>,
  Eye: (p) => <S {...p}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></S>,
  Pin: (p) => <S {...p}><path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></S>,
  Mail: (p) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></S>,
  Phone: (p) => <S {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></S>,
  Bank: (p) => <S {...p}><path d="M3.5 9.5 12 4.5l8.5 5M5 9.5v9M19 9.5v9M3 18.5h18M9 13v5.5M15 13v5.5" /></S>,
  Id: (p) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="8.8" cy="11" r="2.1" /><path d="M5.6 16.2a3.4 3.4 0 0 1 6.4 0M14.5 10h4M14.5 13.5h4" /></S>,
  Target: (p) => <S {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></S>,
  Route: (p) => <S {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6h5a3.5 3.5 0 0 1 0 7h-3a3.5 3.5 0 0 0 0 7h5" /></S>,
  Pencil: (p) => <S {...p}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M14.5 6.5l3 3" /></S>,
  Marker: (p) => <S {...p}><path d="M5 17.5 3.5 21l3.5-1.5L18.8 7.2a2.3 2.3 0 0 0-3.2-3.2z" /><path d="M14.5 5.5l4 4M4.5 16.5l3 3" /></S>,
  Strike: (p) => <S {...p}><path d="M4 12h16" /><path d="M7.5 7.5c0-2 2-3.2 4.5-3.2s4.5 1 4.5 2.8M16.5 16.5c0 2-2 3.2-4.5 3.2s-4.5-1.1-4.5-2.9" /></S>,
  Note: (p) => <S {...p}><path d="M5 4.5h14v10.5L14 20H5z" /><path d="M19 15h-5v5M8.5 9h7M8.5 12.5h4" /></S>,
  Eraser: (p) => <S {...p}><path d="m8 20-4-4a1.8 1.8 0 0 1 0-2.5l8-8a1.8 1.8 0 0 1 2.5 0l4.5 4.5a1.8 1.8 0 0 1 0 2.5L13 20z" /><path d="M20 20h-8M9.5 11.5l5 5" /></S>,
  Phone2: (p) => <S {...p}><path d="M6.5 3.5h2l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 4 1.5v2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" /></S>,
  Heart: (p) => <S {...p}><path d="M12 20s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z" /></S>,
}

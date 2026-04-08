import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '../pages/_app';

const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const TimelineIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const StatsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const JournalIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);

const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/timeline', label: 'Timeline', Icon: TimelineIcon },
  { href: '/stats', label: 'Stats', Icon: StatsIcon },
  { href: '/journal', label: 'Journal', Icon: JournalIcon },
];

export default function Layout({ children, title, subtitle }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="header-title">{title}</div>
          {subtitle && <div className="header-sub">{subtitle}</div>}
        </div>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="main">{children}</main>

      <nav className="bottom-nav">
        {tabs.map(({ href, label, Icon }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon active={active} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

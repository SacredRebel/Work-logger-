import { createContext, useContext, useState, useEffect } from 'react';
import '../styles/globals.css';

export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wl-theme');
    if (saved) setTheme(saved);
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('wl-theme', theme);
      // Update browser chrome color
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#EDE8E0' : '#0A0A0A');
    }
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Component {...pageProps} />
    </ThemeContext.Provider>
  );
}

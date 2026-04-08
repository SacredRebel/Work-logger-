import { useState, useEffect, useCallback } from 'react';

export function useLogs() {
  const [data, setData] = useState({ entries: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/logs?t=' + Date.now());
      if (!r.ok) throw new Error('Could not load logs');
      const d = await r.json();
      setData({ entries: d.entries || [], categories: d.categories || [] });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { ...data, loading, error, refresh: fetch_ };
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function fmtShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d); mon.setDate(diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  };
}

export function totalHours(entries) {
  return entries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
}

export function getCatStyle(categories, catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? { color: cat.color, icon: cat.icon, name: cat.name } : { color: '#98989D', icon: '⚡', name: 'General' };
}

export function getStreak(entries) {
  if (!entries.length) return 0;
  const dates = new Set(entries.map(e => e.date));
  let streak = 0;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const check = new Date(today);
  // If no entry today, start from yesterday
  if (!dates.has(today.toISOString().split('T')[0])) check.setDate(check.getDate() - 1);
  while (dates.has(check.toISOString().split('T')[0])) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function getLast84Days(entries) {
  const map = {};
  entries.forEach(e => { map[e.date] = parseFloat(e.hours) || 0; });
  const days = [];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const str = d.toISOString().split('T')[0];
    days.push({ date: str, hours: map[str] || 0 });
  }
  return days;
}

export function heatLevel(hours) {
  if (!hours) return 0;
  if (hours < 3) return 1;
  if (hours < 5) return 2;
  if (hours < 7) return 3;
  return 4;
}

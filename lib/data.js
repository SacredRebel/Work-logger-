import { useState, useEffect, useCallback } from 'react';

export function useLogs() {
  const [data, setData] = useState({ entries: [], categories: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/logs?t=' + Date.now());
      if (!r.ok) throw new Error('Could not load logs');
      const d = await r.json();
      setData({ entries: d.entries||[], categories: d.categories||[], projects: d.projects||[] });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); const id = setInterval(fetch_, 30000); return () => clearInterval(id); }, [fetch_]);
  return { ...data, loading, error, refresh: fetch_ };
}

export function todayStr() { return new Date().toISOString().split('T')[0]; }

export function fmtDate(dateStr) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
}
export function fmtShort(dateStr) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
export function fmtDay(dateStr) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});
}
export function totalHours(entries) {
  return entries.reduce((s,e) => s+(parseFloat(e.hours)||0), 0);
}
export function totalEarned(entries) {
  return entries.reduce((s,e) => s+(Number(e.earned)||0), 0);
}
export function getProject(projects, id) {
  return projects.find(p => p.id === id) || null;
}
export function getCatStyle(categories, catId) {
  const cat = categories.find(c => c.id === catId);
  return cat || { color:'#98989D', icon:'⚡', name:'General' };
}
export function getStreak(entries) {
  if (!entries.length) return 0;
  const dates = new Set(entries.map(e => e.date));
  let streak = 0;
  const today = new Date(); today.setHours(12,0,0,0);
  const check = new Date(today);
  if (!dates.has(today.toISOString().split('T')[0])) check.setDate(check.getDate()-1);
  while (dates.has(check.toISOString().split('T')[0])) { streak++; check.setDate(check.getDate()-1); }
  return streak;
}
export function getLast84Days(entries) {
  const map = {};
  entries.forEach(e => { map[e.date] = parseFloat(e.hours)||0; });
  const today = new Date(); today.setHours(12,0,0,0);
  return Array.from({length:84},(_,i) => {
    const d = new Date(today); d.setDate(today.getDate()-83+i);
    const str = d.toISOString().split('T')[0];
    return { date:str, hours:map[str]||0 };
  });
}
export function heatLevel(h) {
  if (!h) return 0; if (h<3) return 1; if (h<5) return 2; if (h<7) return 3; return 4;
}
export function getWeekRange(dateStr) {
  const d = new Date(dateStr+'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate()-day+(day===0?-6:1);
  const mon = new Date(d); mon.setDate(diff);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  return { start:mon.toISOString().split('T')[0], end:sun.toISOString().split('T')[0] };
}

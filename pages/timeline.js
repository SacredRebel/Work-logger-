import { useState } from 'react';
import Layout from '../components/Layout';
import { useLogs, todayStr, fmtShort, totalHours, getCatStyle, getWeekRange } from '../lib/data';

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function addWeeks(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_H = 10;

export default function Timeline() {
  const { entries, categories, loading } = useLogs();
  const today = todayStr();
  const [weekOffset, setWeekOffset] = useState(0);

  const baseWeek = getWeekRange(today).start;
  const currentWeekStart = addWeeks(baseWeek, weekOffset);
  const weekDays = getWeekDays(currentWeekStart);
  const weekEnd = weekDays[6];
  const isCurrentWeek = weekOffset === 0;

  const weekEntries = entries.filter(e => e.date >= currentWeekStart && e.date <= weekEnd);
  const weekTotal = totalHours(weekEntries);

  // Category breakdown for the week
  const catMap = {};
  weekEntries.forEach(e => {
    const id = e.category || 'general';
    catMap[id] = (catMap[id] || 0) + (parseFloat(e.hours) || 0);
  });

  const weekLabel = `${fmtShort(currentWeekStart)} – ${fmtShort(weekEnd)}`;

  return (
    <Layout title="Timeline" subtitle={weekLabel}>
      {loading ? (
        <div>
          <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        </div>
      ) : (
        <>
          {/* Week nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>‹ Prev</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isCurrentWeek ? 'var(--accent)' : 'var(--text1)' }}>
                {isCurrentWeek ? 'This Week' : weekLabel}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{weekTotal.toFixed(1)}h total</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setWeekOffset(o => o + 1)}
              disabled={weekOffset >= 0}
              style={{ opacity: weekOffset >= 0 ? 0.35 : 1 }}
            >
              Next ›
            </button>
          </div>

          {/* Week bars */}
          <div className="card card-p" style={{ marginBottom: 20 }}>
            <div className="sec-label">Hours per day</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, alignItems: 'flex-end', height: 140, marginBottom: 8 }}>
              {weekDays.map((date, i) => {
                const entry = entries.find(e => e.date === date);
                const h = entry ? parseFloat(entry.hours) || 0 : 0;
                const cat = entry ? getCatStyle(categories, entry.category) : null;
                const pct = Math.min(h / MAX_H, 1);
                const isToday = date === today;
                return (
                  <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                    {h > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: cat?.color || 'var(--text3)' }}>
                        {h}h
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: h ? `${Math.max(pct * 100, 8)}px` : '4px',
                        background: cat ? cat.color : 'var(--bg3)',
                        borderRadius: '8px 8px 4px 4px',
                        transition: 'height .4s ease',
                        opacity: isToday ? 1 : 0.78,
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text3)', textAlign: 'center' }}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(catMap).length > 0 && (
            <div className="card card-p" style={{ marginBottom: 20 }}>
              <div className="sec-label">By Category</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(catMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([catId, hours]) => {
                    const cat = getCatStyle(categories, catId);
                    const pct = weekTotal > 0 ? (hours / weekTotal) * 100 : 0;
                    return (
                      <div key={catId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.icon} {cat.name}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{hours.toFixed(1)}h</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 3, transition: 'width .4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Day entries */}
          <div className="sec-label">Daily Entries</div>
          {weekDays.filter(d => entries.find(e => e.date === d)).length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📅</div>
              <div className="empty-title">No entries this week</div>
              <div className="empty-sub">Log your hours in chat and they'll appear here.</div>
            </div>
          ) : (
            weekDays.map(date => {
              const entry = entries.find(e => e.date === date);
              if (!entry) return null;
              const cat = getCatStyle(categories, entry.category);
              const h = parseFloat(entry.hours) || 0;
              const isToday = date === today;
              return (
                <div key={date} className="entry-card fade-up">
                  <div className="entry-header" style={{ cursor: 'default' }}>
                    <div className="hours-badge" style={{ background: cat.color }}>
                      <span className="hb-val">{h.toFixed(1)}</span>
                      <span className="hb-lbl">hrs</span>
                    </div>
                    <div className="entry-info">
                      <div className="entry-date" style={{ color: isToday ? 'var(--accent)' : 'var(--text1)' }}>
                        {isToday ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="entry-tasks">{entry.tasks || 'No summary'}</div>
                    </div>
                    <span className="chip" style={{ background: cat.color + '22', color: cat.color, flexShrink: 0 }}>
                      {cat.icon}
                    </span>
                  </div>
                  {entry.notes && (
                    <div className="entry-body">
                      <p className="entry-notes">{entry.notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </Layout>
  );
}

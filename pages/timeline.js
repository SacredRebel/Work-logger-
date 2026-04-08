import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, todayStr, fmtShort, totalHours, getCatStyle, getWeekRange } from '../lib/data';

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}
function shiftWeek(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

export default function Timeline() {
  const { entries, categories, loading } = useLogs();
  const [offset, setOffset] = useState(0);
  const today = todayStr();
  const baseStart = getWeekRange(today).start;
  const weekStart = shiftWeek(baseStart, offset);
  const days = weekDays(weekStart);
  const weekEnd = days[6];
  const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const weekH = totalHours(weekEntries);
  const isNow = offset === 0;

  const catMap = {};
  weekEntries.forEach(e => {
    const id = e.category || 'general';
    catMap[id] = (catMap[id] || 0) + (parseFloat(e.hours) || 0);
  });
  const maxH = Math.max(...days.map(date => {
    const e = entries.find(e => e.date === date);
    return e ? parseFloat(e.hours) || 0 : 0;
  }), 1);

  const [openDay, setOpenDay] = useState(null);

  return (
    <Layout title="Timeline" subtitle={`${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`}>
      {loading ? (
        <>
          <div className="skel" style={{ height: 44, marginBottom: 18 }} />
          <div className="skel" style={{ height: 180, marginBottom: 18 }} />
          <div className="skel" style={{ height: 160 }} />
        </>
      ) : (
        <>
          {/* Week nav */}
          <div className="wnav">
            <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o - 1)}>‹ Prev</button>
            <div className="wnav-center">
              <div className="wnav-label" style={{ color: isNow ? 'var(--accent)' : 'var(--t1)' }}>
                {isNow ? 'This Week' : `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`}
              </div>
              <div className="wnav-sub">{weekH.toFixed(1)}h · {weekEntries.length} day{weekEntries.length !== 1 ? 's' : ''} logged</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} style={{ opacity: offset >= 0 ? 0.3 : 1 }}>Next ›</button>
          </div>

          {/* Day bars */}
          <div className="card card-p" style={{ marginBottom: 18 }}>
            <div className="lbl">Hours per Day</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, alignItems: 'flex-end', height: 130, marginBottom: 8 }}>
              {days.map((date, i) => {
                const entry = entries.find(e => e.date === date);
                const h = entry ? parseFloat(entry.hours) || 0 : 0;
                const cat = entry ? getCatStyle(categories, entry.category) : null;
                const isToday = date === today;
                return (
                  <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                    {h > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: cat?.color }}>{h}h</span>}
                    <div style={{
                      width: '100%',
                      height: h ? `${Math.max((h / maxH) * 96, 6)}px` : '3px',
                      background: cat ? cat.color : 'var(--bg4)',
                      borderRadius: '7px 7px 3px 3px',
                      opacity: isToday ? 1 : 0.72,
                      transition: 'height 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                    <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--t4)' }}>
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(catMap).length > 0 && (
            <div className="card card-p" style={{ marginBottom: 18 }}>
              <div className="lbl">By Category</div>
              <div className="cat-row">
                {Object.entries(catMap).sort((a,b) => b[1]-a[1]).map(([catId, hours]) => {
                  const cat = getCatStyle(categories, catId);
                  const pct = weekH > 0 ? (hours / weekH) * 100 : 0;
                  return (
                    <div key={catId}>
                      <div className="cat-item">
                        <div className="cat-dot" style={{ background: cat.color }} />
                        <span className="cat-name">{cat.icon} {cat.name}</span>
                        <span className="cat-hrs" style={{ color: cat.color }}>{hours.toFixed(1)}h</span>
                      </div>
                      <div className="cat-track">
                        <div className="cat-fill" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day entries */}
          <div className="lbl">Daily Log</div>
          {days.filter(d => entries.find(e => e.date === d)).length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📅</div>
              <div className="empty-title">Nothing logged this week</div>
              <div className="empty-sub">Log your hours and they'll appear here.</div>
            </div>
          ) : days.map((date, i) => {
            const entry = entries.find(e => e.date === date);
            if (!entry) return null;
            const cat = getCatStyle(categories, entry.category);
            const h = parseFloat(entry.hours) || 0;
            const isToday = date === today;
            const isOpen = openDay === date;
            return (
              <div key={date} className="ecard fu">
                <div className="ecard-hdr" onClick={() => setOpenDay(isOpen ? null : date)}>
                  <div className="hrs-badge" style={{ background: cat.color }}>
                    <span className="hv">{h % 1 === 0 ? h : h.toFixed(1)}</span>
                    <span className="hl">HRS</span>
                  </div>
                  <div className="ecard-info">
                    <div className="ecard-date" style={{ color: isToday ? 'var(--accent)' : 'var(--t1)' }}>
                      {isToday ? 'Today' : new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
                    </div>
                    <div className="ecard-task">{entry.tasks || 'No summary'}</div>
                  </div>
                  <span className={`chevron${isOpen ? ' open' : ''}`}>›</span>
                </div>
                {isOpen && (
                  <div className="ecard-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span className="chip" style={{ background: cat.color + '20', color: cat.color }}>{cat.icon} {cat.name}</span>
                      {entry.earned > 0 && <span className="earned-pill">💰 ${Number(entry.earned).toFixed(2)}</span>}
                    </div>
                    <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={cat.color} />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </Layout>
  );
}

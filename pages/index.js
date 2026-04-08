import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, todayStr, fmtDate, fmtShort, totalHours, getCatStyle, getStreak, getLast84Days, heatLevel, getWeekRange } from '../lib/data';

const DAY_LABELS = ['M','T','W','T','F','S','S'];

function Heatmap({ entries }) {
  const days = getLast84Days(entries);
  const today = todayStr();
  return (
    <div className="heatmap">
      <div className="hm-grid">
        {days.map(d => (
          <div
            key={d.date}
            className={`hm-cell hm-${heatLevel(d.hours)}${d.date === today ? ' hm-today' : ''}`}
            title={`${fmtShort(d.date)}: ${d.hours}h`}
          />
        ))}
      </div>
    </div>
  );
}

function WeekMini({ entries, categories }) {
  const today = todayStr();
  const { start } = getWeekRange(today);
  const days = DAY_LABELS.map((_, i) => {
    const d = new Date(start + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
  const maxH = Math.max(...days.map(date => {
    const e = entries.find(e => e.date === date);
    return e ? parseFloat(e.hours) || 0 : 0;
  }), 1);

  return (
    <div className="wbars">
      {days.map((date, i) => {
        const entry = entries.find(e => e.date === date);
        const h = entry ? parseFloat(entry.hours) || 0 : 0;
        const cat = entry ? getCatStyle(categories, entry.category) : null;
        const isToday = date === today;
        const pct = h / maxH;
        return (
          <div key={date} className="wbar-col">
            {h > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: cat?.color || 'var(--t4)' }}>{h}h</span>}
            <div
              className="wbar"
              style={{
                height: h ? `${Math.max(pct * 64, 5)}px` : '3px',
                background: cat ? cat.color : 'var(--bg4)',
                opacity: isToday ? 1 : 0.75,
              }}
            />
            <span className={`wbar-lbl${isToday ? ' today' : ''}`}>{DAY_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function EntryCard({ entry, categories }) {
  const [open, setOpen] = useState(false);
  const [lb, setLb] = useState(null);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours) || 0;

  return (
    <div className="ecard fu">
      <div className="ecard-hdr" onClick={() => setOpen(o => !o)}>
        <div className="hrs-badge" style={{ background: cat.color }}>
          <span className="hv">{h % 1 === 0 ? h : h.toFixed(1)}</span>
          <span className="hl">HRS</span>
        </div>
        <div className="ecard-info">
          <div className="ecard-date">{fmtDate(entry.date)}</div>
          <div className="ecard-task">{entry.tasks || 'No summary'}</div>
        </div>
        <span className={`chevron${open ? ' open' : ''}`}>›</span>
      </div>

      {open && (
        <div className="ecard-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="chip" style={{ background: cat.color + '20', color: cat.color }}>
              {cat.icon} {cat.name}
            </span>
            {entry.earned > 0 && (
              <span className="earned-pill">💰 ${Number(entry.earned).toFixed(2)}</span>
            )}
          </div>
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={cat.color} />
          {entry.images?.length > 0 && (
            <div className="ba-grid">
              {entry.images.map((img, idx) => (
                <div key={idx} className="ba-item" onClick={() => setLb(img.url)}>
                  <img src={img.url} alt={img.type} loading="lazy" />
                  <span className="ba-tag">{img.type === 'before' ? 'Before' : 'After'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lb && (
        <div className="lb-over" onClick={() => setLb(null)}>
          <button className="lb-close">✕</button>
          <img src={lb} className="lb-img" alt="Preview" />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { entries, categories, loading } = useLogs();
  const today = todayStr();
  const { start: ws, end: we } = getWeekRange(today);
  const todayEntry = entries.find(e => e.date === today);
  const weekEntries = entries.filter(e => e.date >= ws && e.date <= we);
  const streak = getStreak(entries);
  const todayH = todayEntry ? parseFloat(todayEntry.hours) || 0 : 0;
  const weekH = totalHours(weekEntries);
  const totalEarned = entries.reduce((s, e) => s + (Number(e.earned) || 0), 0);
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Layout title={greet} subtitle={dateLabel}>
      {loading ? (
        <>
          <div className="tiles">{[0,1,2].map(i => <div key={i} className="skel" style={{ height: 74 }} />)}</div>
          <div className="skel" style={{ height: 60, marginBottom: 18 }} />
          <div className="skel" style={{ height: 118, marginBottom: 18 }} />
          <div className="skel" style={{ height: 96, marginBottom: 18 }} />
          <div className="skel" style={{ height: 200 }} />
        </>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="tiles">
            <div className="tile"><span className="tile-val accent">{todayH % 1 === 0 ? todayH : todayH.toFixed(1)}h</span><span className="tile-lbl">Today</span></div>
            <div className="tile"><span className="tile-val">{weekH % 1 === 0 ? weekH : weekH.toFixed(1)}h</span><span className="tile-lbl">This week</span></div>
            <div className="tile"><span className="tile-val">{streak}</span><span className="tile-lbl">🔥 Streak</span></div>
          </div>

          {/* Total earned */}
          {totalEarned > 0 && (
            <div className="earn-banner">
              <div>
                <div className="earn-label">Total Earned</div>
                <div className="earn-val">${totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <span style={{ fontSize: 30 }}>💰</span>
            </div>
          )}

          {/* Week chart */}
          <div className="card card-p" style={{ marginBottom: 18 }}>
            <div className="lbl">This Week</div>
            <WeekMini entries={weekEntries} categories={categories} />
          </div>

          {/* Heatmap */}
          <div className="card card-p" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="lbl" style={{ marginBottom: 0 }}>Activity</div>
              <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>12 weeks</span>
            </div>
            <Heatmap entries={entries} />
          </div>

          {/* Recent entries */}
          <div className="lbl">Recent Entries</div>
          {recent.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">🖌️</div>
              <div className="empty-title">No entries yet</div>
              <div className="empty-sub">Tell me your hours and what you worked on — I'll log it instantly.</div>
            </div>
          ) : recent.map(e => <EntryCard key={e.date} entry={e} categories={categories} />)}
        </>
      )}
    </Layout>
  );
}

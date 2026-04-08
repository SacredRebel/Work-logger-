import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, todayStr, fmtDate, fmtShort, totalHours, getCatStyle, getStreak, getLast84Days, heatLevel, getWeekRange } from '../lib/data';

function Heatmap({ entries }) {
  const days = getLast84Days(entries);
  const today = todayStr();
  return (
    <div className="heatmap-wrap">
      <div className="heatmap-grid">
        {days.map(d => (
          <div key={d.date} className={`hm-cell hm-${heatLevel(d.hours)}${d.date === today ? ' hm-today' : ''}`} title={`${fmtShort(d.date)}: ${d.hours}h`} />
        ))}
      </div>
    </div>
  );
}

function WeekMini({ entries, categories }) {
  const today = todayStr();
  const { start } = getWeekRange(today);
  const labels = ['M','T','W','T','F','S','S'];
  const days = Array.from({length:7},(_,i) => {
    const d = new Date(start+'T12:00:00');
    d.setDate(d.getDate()+i);
    return d.toISOString().split('T')[0];
  });
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,alignItems:'flex-end',height:80}}>
      {days.map((date,i) => {
        const entry = entries.find(e => e.date === date);
        const h = entry ? parseFloat(entry.hours)||0 : 0;
        const cat = entry ? getCatStyle(categories, entry.category) : null;
        const isToday = date === today;
        return (
          <div key={date} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}>
            <div style={{width:'100%',height:h?`${Math.max((h/8)*60,6)}px`:'4px',background:cat?cat.color:'var(--bg3)',borderRadius:'6px 6px 3px 3px',opacity:isToday?1:.72,transition:'height .3s'}} />
            <span style={{fontSize:10,fontWeight:isToday?700:500,color:isToday?'var(--accent)':'var(--text3)'}}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function EntryCard({ entry, categories }) {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const cat = getCatStyle(categories, entry.category);
  const hours = parseFloat(entry.hours)||0;

  return (
    <div className="entry-card fade-up">
      <div className="entry-header" onClick={() => setOpen(o => !o)}>
        <div className="hours-badge" style={{background:cat.color}}>
          <span className="hb-val">{hours.toFixed(1)}</span>
          <span className="hb-lbl">hrs</span>
        </div>
        <div className="entry-info">
          <div className="entry-date">{fmtDate(entry.date)}</div>
          <div className="entry-tasks">{entry.tasks||'No summary'}</div>
        </div>
        <span style={{color:'var(--text4)',fontSize:20,transition:'transform .2s',transform:open?'rotate(90deg)':'none',flexShrink:0}}>›</span>
      </div>

      {open && (
        <div className="entry-body">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <span className="chip" style={{background:cat.color+'22',color:cat.color}}>{cat.icon} {cat.name}</span>
            {entry.earned && (
              <span style={{fontSize:13,fontWeight:700,color:'#30D158'}}>💰 ${entry.earned.toFixed(2)}</span>
            )}
          </div>
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={cat.color} />
          {entry.images && entry.images.length > 0 && (
            <div className="ba-grid">
              {entry.images.map((img,idx) => (
                <div key={idx} className="ba-item" onClick={() => setLightbox(img.url)}>
                  <img src={img.url} alt={img.type} loading="lazy" />
                  <span className="ba-badge">{img.type==='before'?'Before':'After'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} className="lightbox-img" alt="Preview" />
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
  const todayH = todayEntry ? parseFloat(todayEntry.hours)||0 : 0;
  const weekH = totalHours(weekEntries);
  const recent = [...entries].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const hour = new Date().getHours();
  const greet = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  // Total earned across all entries
  const totalEarned = entries.reduce((s,e) => s+(e.earned||0), 0);

  return (
    <Layout title={greet+' 👋'} subtitle={dateLabel}>
      {loading ? (
        <div>
          <div className="stats-row">{[1,2,3].map(i=><div key={i} className="stat-tile skeleton" style={{height:76}}/>)}</div>
          <div className="skeleton" style={{height:110,marginBottom:20,borderRadius:16}}/>
          <div className="skeleton" style={{height:100,marginBottom:24,borderRadius:16}}/>
          <div className="skeleton" style={{height:180,borderRadius:16}}/>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-tile">
              <span className="stat-val stat-accent">{todayH.toFixed(1)}h</span>
              <span className="stat-lbl">Today</span>
            </div>
            <div className="stat-tile">
              <span className="stat-val">{weekH.toFixed(1)}h</span>
              <span className="stat-lbl">This week</span>
            </div>
            <div className="stat-tile">
              <span className="stat-val">{streak}</span>
              <span className="stat-lbl">🔥 Streak</span>
            </div>
          </div>

          {/* Total earned banner */}
          {totalEarned > 0 && (
            <div style={{background:'linear-gradient(135deg,#1a2e1a,#0d1f0d)',border:'1px solid #30D15830',borderRadius:16,padding:'14px 16px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#30D15899',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:3}}>Total Earned</div>
                <div style={{fontSize:26,fontWeight:800,color:'#30D158',letterSpacing:'-.04em'}}>${totalEarned.toFixed(2)}</div>
              </div>
              <span style={{fontSize:28}}>💰</span>
            </div>
          )}

          <div className="card card-p" style={{marginBottom:20}}>
            <div className="sec-label">This Week</div>
            <WeekMini entries={weekEntries} categories={categories}/>
          </div>

          <div className="card card-p" style={{marginBottom:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div className="sec-label" style={{marginBottom:0}}>Activity</div>
              <span style={{fontSize:12,color:'var(--text3)'}}>Last 12 weeks</span>
            </div>
            <Heatmap entries={entries}/>
          </div>

          <div className="sec-label">Recent</div>
          {recent.length===0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No entries yet</div>
              <div className="empty-sub">Tell me your hours and tasks — I'll log it right here.</div>
            </div>
          ) : recent.map(e => <EntryCard key={e.date} entry={e} categories={categories}/>)}
        </>
      )}
    </Layout>
  );
}

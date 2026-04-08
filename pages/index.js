import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, todayStr, fmtDate, fmtShort, totalHours, getCatStyle, getStreak, getLast84Days, heatLevel, getWeekRange } from '../lib/data';

const DAYS = ['M','T','W','T','F','S','S'];

function Heatmap({ entries }) {
  const cells = getLast84Days(entries);
  const today = todayStr();
  return (
    <div className="hm-wrap">
      <div className="hm-grid">
        {cells.map(d => (
          <div key={d.date}
            className={`hm-cell hm-${heatLevel(d.hours)}${d.date===today?' hm-today':''}`}
            title={`${fmtShort(d.date)}: ${d.hours}h`}
          />
        ))}
      </div>
    </div>
  );
}

function WeekBars({ entries, categories }) {
  const today = todayStr();
  const { start } = getWeekRange(today);
  const dates = DAYS.map((_, i) => { const d = new Date(start+'T12:00:00'); d.setDate(d.getDate()+i); return d.toISOString().split('T')[0]; });
  const hours = dates.map(dt => { const e = entries.find(e => e.date===dt); return e ? parseFloat(e.hours)||0 : 0; });
  const peak = Math.max(...hours, 1);
  return (
    <div className="wk-bars">
      {dates.map((dt, i) => {
        const h = hours[i];
        const e = entries.find(e => e.date===dt);
        const cat = e ? getCatStyle(categories, e.category) : null;
        const isToday = dt===today;
        return (
          <div key={dt} className="wk-col">
            {h > 0 && <span style={{ fontSize:8, fontWeight:700, color:cat?.color||'var(--t3)' }}>{h}h</span>}
            <div className="wk-bar" style={{ height:`${Math.max((h/peak)*62,3)}px`, background:h?cat?.color||'var(--accent)':'var(--s3)', opacity:isToday?1:0.7 }} />
            <span className="wk-lbl" style={{ color:isToday?'var(--accent)':'var(--t4)', fontWeight:isToday?700:600 }}>{DAYS[i]}</span>
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
  const h = parseFloat(entry.hours)||0;
  return (
    <div className="ec fi">
      <div className="ec-hdr" onClick={()=>setOpen(v=>!v)}>
        <div className="badge" style={{ background:cat.color }}>
          <span className="badge-v">{Number.isInteger(h)?h:h.toFixed(1)}</span>
          <span className="badge-l">HRS</span>
        </div>
        <div className="ec-info">
          <div className="ec-date">{fmtDate(entry.date)}</div>
          <div className="ec-task">{entry.tasks||'No summary'}</div>
        </div>
        <span className={`caret${open?' open':''}`}>›</span>
      </div>
      {open && (
        <div className="ec-body">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:7 }}>
            <span className="chip" style={{ background:cat.color+'1A', color:cat.color }}>{cat.icon} {cat.name}</span>
            {!!entry.earned && <span className="earn-chip">💰 ${Number(entry.earned).toFixed(2)}</span>}
          </div>
          <NotesRenderer sections={entry.sections} notes={entry.notes} color={cat.color} />
          {entry.images?.length > 0 && (
            <div className="ba-grid">
              {entry.images.map((img,i) => (
                <div key={i} className="ba-item" onClick={()=>setLb(img.url)}>
                  <img src={img.url} alt={img.type} loading="lazy" />
                  <span className="ba-tag">{img.type==='before'?'Before':'After'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {lb && <div className="lb" onClick={()=>setLb(null)}><button className="lb-x">✕</button><img src={lb} alt="full" /></div>}
    </div>
  );
}

export default function Home() {
  const { entries, categories, loading } = useLogs();
  const today = todayStr();
  const { start:ws, end:we } = getWeekRange(today);
  const todayE = entries.find(e=>e.date===today);
  const weekE  = entries.filter(e=>e.date>=ws&&e.date<=we);
  const todayH = todayE ? parseFloat(todayE.hours)||0 : 0;
  const weekH  = totalHours(weekE);
  const streak = getStreak(entries);
  const earned = entries.reduce((s,e)=>s+(Number(e.earned)||0),0);
  const recent = [...entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const h = new Date().getHours();
  const greet = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const sub = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  return (
    <Layout title={greet} subtitle={sub}>
      {loading ? (
        <>
          <div className="tile-grid">{[0,1,2].map(i=><div key={i} className="sk" style={{height:70}}/>)}</div>
          <div className="sk" style={{height:56,marginBottom:16}}/>
          <div className="sk" style={{height:108,marginBottom:16}}/>
          <div className="sk" style={{height:90,marginBottom:16}}/>
          <div className="sk" style={{height:180}}/>
        </>
      ) : (
        <>
          <div className="tile-grid">
            <div className="tile"><div className="tile-v ac">{Number.isInteger(todayH)?todayH:todayH.toFixed(1)}h</div><div className="tile-l">Today</div></div>
            <div className="tile"><div className="tile-v">{Number.isInteger(weekH)?weekH:weekH.toFixed(1)}h</div><div className="tile-l">This week</div></div>
            <div className="tile"><div className="tile-v">{streak}</div><div className="tile-l">🔥 Streak</div></div>
          </div>

          {earned > 0 && (
            <div className="earn-banner">
              <div>
                <div className="earn-lbl">Total Earned</div>
                <div className="earn-val">${earned.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
              </div>
              <span style={{fontSize:28}}>💰</span>
            </div>
          )}

          <div className="card pad" style={{marginBottom:14}}>
            <div className="lbl">This Week</div>
            <WeekBars entries={weekE} categories={categories}/>
          </div>

          <div className="card pad" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
              <div className="lbl" style={{marginBottom:0}}>Activity</div>
              <span style={{fontSize:10,color:'var(--t3)',fontWeight:600}}>12 weeks</span>
            </div>
            <Heatmap entries={entries}/>
          </div>

          <div className="lbl">Recent</div>
          {recent.length===0
            ? <div className="empty"><div className="empty-ico">🖌️</div><div className="empty-h">No entries yet</div><div className="empty-s">Tell me your hours and what you worked on — I'll log it here.</div></div>
            : recent.map(e=><EntryCard key={e.date} entry={e} categories={categories}/>)
          }
        </>
      )}
    </Layout>
  );
}

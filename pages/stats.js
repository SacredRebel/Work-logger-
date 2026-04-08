import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useLogs, todayStr, totalHours, getCatStyle, getWeekRange } from '../lib/data';

function getLast7() {
  const t = new Date(); t.setHours(12,0,0,0);
  return Array.from({length:7},(_,i)=>{ const d=new Date(t); d.setDate(t.getDate()-6+i); return d.toISOString().split('T')[0]; });
}
function getLast30() {
  const t = new Date(); t.setHours(12,0,0,0);
  return Array.from({length:30},(_,i)=>{ const d=new Date(t); d.setDate(t.getDate()-29+i); return d.toISOString().split('T')[0]; });
}

function BarChart({ data, maxH }) {
  const peak = Math.max(...data.map(d => d.h), maxH, 1);
  return (
    <div className="bchart">
      {data.map((d, i) => (
        <div key={i} className="bchart-col">
          {d.h > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: d.color || 'var(--accent)', marginBottom: 1 }}>{d.h}</span>}
          <div
            className="bchart-bar"
            style={{
              height: d.h ? `${Math.max((d.h / peak) * 96, 4)}px` : '2px',
              background: d.color || 'var(--accent)',
              opacity: d.h ? 1 : 0.2,
            }}
          />
          <span className="bchart-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  const { entries, categories, loading } = useLogs();
  const [period, setPeriod] = useState('week');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const today = todayStr();
  const days = period === 'week' ? getLast7() : getLast30();

  const barData = days.map(date => {
    const entry = entries.find(e => e.date === date);
    const h = entry ? parseFloat(entry.hours)||0 : 0;
    const cat = entry ? getCatStyle(categories, entry.category) : null;
    const d = new Date(date+'T12:00:00');
    const label = period === 'week'
      ? d.toLocaleDateString('en-US',{weekday:'narrow'})
      : (d.getDate()===1||d.getDate()%7===1 ? `${d.getDate()}` : '');
    return { label, h: parseFloat(h.toFixed(1)), color: cat?.color, date };
  });

  const periodEntries = entries.filter(e => days.includes(e.date));
  const periodH = totalHours(periodEntries);
  const loggedDays = periodEntries.length;
  const avgH = loggedDays > 0 ? periodH / loggedDays : 0;
  const bestH = Math.max(...periodEntries.map(e => parseFloat(e.hours)||0), 0);
  const periodEarned = periodEntries.reduce((s,e) => s+(Number(e.earned)||0), 0);

  const catMap = {};
  periodEntries.forEach(e => {
    const id = e.category||'general';
    catMap[id] = (catMap[id]||0) + (parseFloat(e.hours)||0);
  });
  const catList = Object.entries(catMap).map(([id,hours]) => {
    const cat = getCatStyle(categories, id);
    return { ...cat, hours: parseFloat(hours.toFixed(1)) };
  }).sort((a,b) => b.hours-a.hours);

  const allH = totalHours(entries);
  const allDays = entries.length;
  const allEarned = entries.reduce((s,e) => s+(Number(e.earned)||0), 0);

  if (!mounted || loading) return (
    <Layout title="Analytics">
      <div className="skel" style={{ height: 44, marginBottom: 18 }} />
      <div className="skel" style={{ height: 84, marginBottom: 18 }} />
      <div className="skel" style={{ height: 160, marginBottom: 18 }} />
      <div className="skel" style={{ height: 200 }} />
    </Layout>
  );

  return (
    <Layout title="Analytics">
      {/* Period toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
        <div className="ptog" style={{ flex: 1, marginRight: 12 }}>
          <button className={`pbtn${period==='week'?' on':''}`} onClick={()=>setPeriod('week')}>7 Days</button>
          <button className={`pbtn${period==='month'?' on':''}`} onClick={()=>setPeriod('month')}>30 Days</button>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing:'-0.04em', color:'var(--t1)' }}>{periodH.toFixed(1)}h</div>
          <div style={{ fontSize: 11, color:'var(--t3)' }}>total</div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="stat-strip" style={{ marginBottom: 18 }}>
        <div className="tile"><span className="tile-val" style={{fontSize:18}}>{avgH.toFixed(1)}h</span><span className="tile-lbl">Avg/day</span></div>
        <div className="tile"><span className="tile-val" style={{fontSize:18}}>{bestH.toFixed(1)}h</span><span className="tile-lbl">Best day</span></div>
        <div className="tile"><span className="tile-val" style={{fontSize:18}}>{loggedDays}</span><span className="tile-lbl">Days logged</span></div>
      </div>

      {/* Earned this period */}
      {periodEarned > 0 && (
        <div className="earn-banner" style={{ marginBottom: 18 }}>
          <div>
            <div className="earn-label">Earned ({period === 'week' ? '7 days' : '30 days'})</div>
            <div className="earn-val">${periodEarned.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
          </div>
          <span style={{ fontSize: 28 }}>💰</span>
        </div>
      )}

      {/* Bar chart */}
      <div className="card card-p" style={{ marginBottom: 18 }}>
        <div className="lbl">Hours Per Day</div>
        <BarChart data={barData} />
      </div>

      {/* Category breakdown */}
      {catList.length > 0 && (
        <div className="card card-p" style={{ marginBottom: 18 }}>
          <div className="lbl">By Category</div>
          <div className="cat-row">
            {catList.map(cat => {
              const pct = periodH > 0 ? (cat.hours / periodH) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="cat-item">
                    <div className="cat-dot" style={{ background: cat.color }} />
                    <span className="cat-name">{cat.icon} {cat.name}</span>
                    <span className="cat-hrs" style={{ color: cat.color }}>{cat.hours}h · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="cat-track">
                    <div className="cat-fill" style={{ width:`${pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All time */}
      <div className="card card-p">
        <div className="lbl">All Time</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, textAlign:'center' }}>
          {[
            { val: `${allH.toFixed(0)}h`, lbl: 'Total hours', accent: true },
            { val: allDays, lbl: 'Days logged' },
            { val: `$${allEarned.toFixed(0)}`, lbl: 'Total earned', green: true },
          ].map(({ val, lbl, accent, green }) => (
            <div key={lbl}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing:'-0.04em', color: accent?'var(--accent)':green?'var(--green)':'var(--t1)' }}>{val}</div>
              <div style={{ fontSize: 11, color:'var(--t3)', marginTop:3 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="empty">
          <div className="empty-ico">📊</div>
          <div className="empty-title">No data yet</div>
          <div className="empty-sub">Log some work and your stats will appear here.</div>
        </div>
      )}
    </Layout>
  );
}

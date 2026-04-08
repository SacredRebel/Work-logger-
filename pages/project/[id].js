import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotesRenderer from '../../components/NotesRenderer';
import { useLogs, fmtDate, fmtShort, totalHours, totalEarned, getCatStyle, getStreak, getLast84Days, heatLevel, getWeekRange, todayStr } from '../../lib/data';

const DAY_LABELS = ['M','T','W','T','F','S','S'];

function Heatmap({ entries }) {
  const days = getLast84Days(entries);
  const today = todayStr();
  return (
    <div className="heatmap">
      <div className="hm-grid">
        {days.map(d => (
          <div key={d.date} className={`hm-cell hm-${heatLevel(d.hours)}${d.date===today?' hm-today':''}`} title={`${fmtShort(d.date)}: ${d.hours}h`} />
        ))}
      </div>
    </div>
  );
}

function ImagesSection({ images, accentColor }) {
  const [lb, setLb] = useState(null);
  if (!images || images.length === 0) return null;

  const before = images.filter(i => i.type === 'before');
  const after  = images.filter(i => i.type === 'after');

  const ImageGrid = ({ imgs, label }) => {
    if (!imgs.length) return null;
    return (
      <div style={{ marginBottom: after.length && label==='Before' ? 14 : 0 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:8 }}>{label}</div>
        <div style={{ display:'grid', gridTemplateColumns: imgs.length===1?'1fr':'1fr 1fr', gap:8 }}>
          {imgs.map((img, idx) => (
            <div key={idx} className="ba-item" onClick={()=>setLb(img)} style={{ aspectRatio: imgs.length===1?'16/9':'4/3' }}>
              <img src={img.url} alt={img.caption||label} loading="lazy"
                onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
              />
              <div style={{ display:'none', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--t4)', fontSize:22 }}>📷</div>
              {img.caption && <span className="ba-tag">{img.caption}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:10 }}>
        Photos · {images.length}
      </div>
      {before.length > 0 && <ImageGrid imgs={before} label="Before" />}
      {after.length > 0 && <ImageGrid imgs={after} label="After" />}
      {lb && (
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close">✕</button>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <img src={lb.url} className="lb-img" alt={lb.caption} />
            {lb.caption && <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13, fontWeight:500 }}>{lb.caption}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, categories, accentColor }) {
  const [open, setOpen] = useState(false);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours)||0;
  const color = accentColor || cat.color;
  const hasImages = entry.images && entry.images.length > 0;
  const today = todayStr();

  return (
    <div className="ecard fu">
      <div className="ecard-hdr" onClick={()=>setOpen(o=>!o)}>
        <div className="hrs-badge" style={{ background:color }}>
          <span className="hv">{h%1===0?h:h.toFixed(1)}</span>
          <span className="hl">HRS</span>
        </div>
        <div className="ecard-info">
          <div className="ecard-date" style={{ color:entry.date===today?'var(--accent)':'var(--t1)' }}>
            {entry.date===today ? 'Today — ' : ''}{fmtDate(entry.date)}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:3, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--t3)' }}>{entry.tasks}</span>
            {hasImages && <span style={{ fontSize:10, color:'var(--t4)' }}>📷 {entry.images.length}</span>}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
          {entry.earned>0 && <span style={{ fontSize:12, fontWeight:800, color:'#22C55E' }}>${Number(entry.earned).toFixed(0)}</span>}
          <span className={`chevron${open?' open':''}`}>›</span>
        </div>
      </div>

      {open && (
        <div className="ecard-body">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span className="chip" style={{ background:cat.color+'20', color:cat.color }}>{cat.icon} {cat.name}</span>
            {entry.earned>0 && <span className="earned-pill">💰 ${Number(entry.earned).toFixed(2)}</span>}
          </div>
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={color} />
          <ImagesSection images={entry.images} accentColor={color} />
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { projects, entries, categories, loading } = useLogs();
  const [tab, setTab] = useState('log');

  if (!id) return null;
  const project = projects.find(p => p.id === id);
  const pEntries = entries.filter(e => e.project === id).sort((a,b)=>b.date.localeCompare(a.date));
  const hrs = totalHours(pEntries);
  const earned = totalEarned(pEntries);
  const streak = getStreak(pEntries);
  const today = todayStr();
  const { start:ws, end:we } = getWeekRange(today);
  const weekEntries = pEntries.filter(e => e.date>=ws && e.date<=we);
  const weekH = totalHours(weekEntries);
  const color = project?.color || 'var(--accent)';

  if (loading) return (
    <div className="app">
      <div style={{ padding:'60px 20px', textAlign:'center' }}>
        <div className="skel" style={{ height:200, borderRadius:20 }} />
      </div>
    </div>
  );

  if (!project) return (
    <div className="app">
      <div className="empty" style={{ paddingTop:80 }}>
        <div className="empty-ico">❓</div>
        <div className="empty-title">Project not found</div>
        <Link href="/" style={{ color:'var(--accent)', fontSize:14, fontWeight:600 }}>← Back to Projects</Link>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* Custom header */}
      <header className="hdr">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>router.push('/')} className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:18 }}>{project.icon}</span>
              <span className="hdr-title">{project.name}</span>
            </div>
            <div className="hdr-sub">{project.client} · Started {fmtShort(project.startDate)}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:9999, background:color+'18', color:color }}>
            Active
          </span>
        </div>
      </header>

      <main className="main">
        {/* Project stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
          {[
            { val:`${hrs.toFixed(1)}h`, lbl:'Total hours', c:color },
            { val:pEntries.length, lbl:'Days logged', c:'var(--t1)' },
            { val:`$${earned.toFixed(0)}`, lbl:'Total earned', c:'#22C55E' },
          ].map(({val,lbl,c})=>(
            <div key={lbl} className="tile">
              <span className="tile-val" style={{ color:c, fontSize:20 }}>{val}</span>
              <span className="tile-lbl">{lbl}</span>
            </div>
          ))}
        </div>

        {/* Streak + week */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
          <div className="tile" style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>🔥</span>
            <div><div className="tile-val" style={{ fontSize:20 }}>{streak}</div><div className="tile-lbl">Day streak</div></div>
          </div>
          <div className="tile">
            <span className="tile-val" style={{ fontSize:20 }}>{weekH.toFixed(1)}h</span>
            <span className="tile-lbl">This week</span>
          </div>
        </div>

        {/* Activity heatmap */}
        <div className="card card-p" style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="lbl" style={{ marginBottom:0 }}>Activity</div>
            <span style={{ fontSize:11, color:'var(--t3)' }}>12 weeks</span>
          </div>
          <Heatmap entries={pEntries} />
        </div>

        {/* Tab toggle */}
        <div className="ptog" style={{ marginBottom:18 }}>
          <button className={`pbtn${tab==='log'?' on':''}`} onClick={()=>setTab('log')}>Work Log</button>
          <button className={`pbtn${tab==='photos'?' on':''}`} onClick={()=>setTab('photos')}>Photos</button>
        </div>

        {/* Log tab */}
        {tab === 'log' && (
          pEntries.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📋</div>
              <div className="empty-title">No logs yet</div>
              <div className="empty-sub">Tell me what you worked on today and I'll add it here.</div>
            </div>
          ) : pEntries.map(e => <EntryCard key={e.date} entry={e} categories={categories} accentColor={color} />)
        )}

        {/* Photos tab */}
        {tab === 'photos' && (() => {
          const allImages = pEntries.flatMap(e => (e.images||[]).map(img=>({...img, date:e.date})));
          if (allImages.length === 0) return (
            <div className="empty">
              <div className="empty-ico">📷</div>
              <div className="empty-title">No photos yet</div>
              <div className="empty-sub">Share before/after photos in chat and I'll attach them to your daily logs.</div>
            </div>
          );
          const byDate = {};
          allImages.forEach(img => { byDate[img.date] = byDate[img.date]||[]; byDate[img.date].push(img); });
          return Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,imgs])=>(
            <div key={date} style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--t3)', marginBottom:10 }}>
                {fmtDate(date)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {imgs.map((img,idx)=>{
                  const [lb2, setLb2] = useState(null);
                  return (
                    <div key={idx} className="ba-item" onClick={()=>setLb2(img)}>
                      <img src={img.url} alt={img.caption} loading="lazy"
                        onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                      />
                      <div style={{ display:'none', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--t4)', fontSize:22 }}>📷</div>
                      <span className="ba-tag">{img.type==='before'?'Before':'After'}</span>
                      {lb2 && <div className="lb-over" onClick={e=>{e.stopPropagation();setLb2(null)}}><button className="lb-close">✕</button><img src={lb2.url} className="lb-img" alt="" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </main>

      {/* Bottom nav */}
      <nav className="bnav">
        <Link href="/" className="bnav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
          <span>Projects</span>
        </Link>
        <Link href="/timeline" className="bnav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Timeline</span>
        </Link>
        <Link href="/stats" className="bnav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Stats</span>
        </Link>
        <Link href="/journal" className="bnav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          <span>Journal</span>
        </Link>
      </nav>
    </div>
  );
}

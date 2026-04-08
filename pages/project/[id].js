import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotesRenderer from '../../components/NotesRenderer';
import PhotoUploader from '../../components/PhotoUploader';
import { useLogs, fmtDate, fmtShort, totalHours, totalEarned, getCatStyle, getStreak, getWeekRange, todayStr } from '../../lib/data';

/* ── Heatmap — scrollable, full width ─────────────────────── */
function Heatmap({ entries, color }) {
  const today = new Date(); today.setHours(12,0,0,0);
  const todayStr_ = today.toISOString().split('T')[0];
  const map = {};
  entries.forEach(e => { map[e.date] = parseFloat(e.hours)||0; });
  // 84 days = 12 weeks
  const days = Array.from({length:84},(_,i)=>{
    const d = new Date(today); d.setDate(today.getDate()-83+i);
    const str = d.toISOString().split('T')[0];
    return { str, h: map[str]||0, isToday: str===todayStr_ };
  });
  const maxH = Math.max(...days.map(d=>d.h), 1);
  // month labels
  const months = [];
  for (let col=0; col<12; col++) {
    const d = days[col*7];
    const m = new Date(d.str+'T12:00:00').toLocaleDateString('en-US',{month:'short'});
    months.push(m);
  }

  return (
    <div>
      {/* Month row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', marginBottom:4 }}>
        {months.map((m,i)=>(
          <div key={i} style={{ fontSize:9, fontWeight:600, color:'var(--t4)', letterSpacing:'0.04em' }}>{m}</div>
        ))}
      </div>
      {/* Day-of-week + grid */}
      <div style={{ display:'flex', gap:6 }}>
        {/* Day labels */}
        <div style={{ display:'flex', flexDirection:'column', gap:3, paddingTop:1 }}>
          {['M','','W','','F','','S'].map((l,i)=>(
            <div key={i} style={{ height:11, fontSize:8, fontWeight:600, color:'var(--t4)', lineHeight:'11px' }}>{l}</div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display:'grid', gridAutoFlow:'column', gridTemplateRows:'repeat(7,11px)', gap:3, flex:1 }}>
          {days.map((day,i)=>{
            const op = day.h ? 0.20 + (day.h/maxH)*0.80 : 1;
            return (
              <div key={i} title={`${day.str}: ${day.h}h`} style={{
                width:'100%', height:11, borderRadius:3,
                background: day.h ? color : 'var(--bg3)',
                opacity: day.h ? op : 1,
                outline: day.isToday ? `2px solid ${color}` : 'none',
                outlineOffset: 1,
              }}/>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8, justifyContent:'flex-end' }}>
        <span style={{ fontSize:9, color:'var(--t4)', fontWeight:600 }}>Less</span>
        {[0,0.25,0.5,0.75,1].map((op,i)=>(
          <div key={i} style={{ width:10, height:10, borderRadius:3, background:i===0?'var(--bg3)':color, opacity:i===0?1:0.2+op*0.8 }}/>
        ))}
        <span style={{ fontSize:9, color:'var(--t4)', fontWeight:600 }}>More</span>
      </div>
    </div>
  );
}

/* ── Images section inside an entry ───────────────────────── */
function ImagesSection({ images, accentColor }) {
  const [lb, setLb] = useState(null);
  const before = (images||[]).filter(i=>i.type==='before');
  const after  = (images||[]).filter(i=>i.type==='after');
  if (!before.length && !after.length) return null;

  const Grid = ({imgs, label, tagColor}) => (
    <div>
      <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>{label}</div>
      <div style={{ display:'grid', gridTemplateColumns:imgs.length===1?'1fr':'1fr 1fr', gap:8 }}>
        {imgs.map((img,idx)=>(
          <div key={idx} className="ba-item" onClick={()=>setLb(img)} style={{ aspectRatio:imgs.length===1?'16/9':'4/3' }}>
            <img src={img.url} alt={label} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              onError={e=>{e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex';}}/>
            <div style={{ display:'none', position:'absolute', inset:0, alignItems:'center', justifyContent:'center', background:'var(--bg3)', color:'var(--t4)', fontSize:24 }}>📷</div>
            <span className="ba-tag" style={{ background:tagColor }}>{label}</span>
            {img.caption && <span style={{ position:'absolute', bottom:6, left:6, right:6, fontSize:10, color:'rgba(255,255,255,0.8)', fontWeight:600 }}>{img.caption}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {before.length > 0 && <Grid imgs={before} label="Before" tagColor="rgba(251,191,36,0.85)"/>}
      {after.length > 0  && <Grid imgs={after}  label="After"  tagColor="rgba(34,197,94,0.85)"/>}
      {lb && (
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close" onClick={e=>{e.stopPropagation();setLb(null)}}>✕</button>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <img src={lb.url} className="lb-img" alt=""/>
            {lb.caption && <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13, fontWeight:500 }}>{lb.caption}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Single day entry card ────────────────────────────────── */
function EntryCard({ entry, categories, color, projectId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours)||0;
  const today = todayStr();
  const isToday = entry.date === today;
  const imgCount = (entry.images||[]).length;
  const beforeCount = (entry.images||[]).filter(i=>i.type==='before').length;
  const afterCount  = (entry.images||[]).filter(i=>i.type==='after').length;

  return (
    <div style={{
      background:'var(--bg2)', borderRadius:18, overflow:'hidden',
      marginBottom:12, border:`1px solid ${open ? color+'40' : 'var(--sep)'}`,
      boxShadow: open ? `0 4px 24px ${color}15, var(--card-shadow)` : 'var(--card-shadow)',
      transition:'border-color 0.2s, box-shadow 0.2s',
    }}>
      {/* Clickable header */}
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:13, padding:'15px 16px',
        cursor:'pointer', userSelect:'none',
        background: open ? `${color}08` : 'transparent',
        transition:'background 0.2s',
      }}>
        {/* Color bar left */}
        <div style={{ width:4, height:48, borderRadius:2, background:color, flexShrink:0, opacity: open?1:0.5, transition:'opacity 0.2s' }}/>

        {/* Hours badge */}
        <div style={{
          width:50, height:50, borderRadius:14, background:`linear-gradient(135deg,${color},${color}cc)`,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0,
          boxShadow:`0 2px 8px ${color}40`,
        }}>
          <span style={{ fontSize:16, fontWeight:800, color:'#fff', lineHeight:1 }}>{h%1===0?h:h.toFixed(1)}</span>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.65)', letterSpacing:'0.05em', marginTop:1 }}>HRS</span>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:isToday?color:'var(--t1)', letterSpacing:'-0.01em', marginBottom:4 }}>
            {isToday ? '🟢 Today — ' : ''}{new Date(entry.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--t3)', background:'var(--bg3)', padding:'2px 8px', borderRadius:99 }}>
              {cat.icon} {cat.name}
            </span>
            {imgCount>0 && (
              <span style={{ fontSize:11, color:'var(--t4)', display:'flex', alignItems:'center', gap:3 }}>
                📷 {imgCount}
                {beforeCount>0 && afterCount>0 && <span style={{ color:'var(--t4)' }}>· B{beforeCount}/A{afterCount}</span>}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
          {entry.earned>0 && (
            <span style={{ fontSize:14, fontWeight:800, color:'#22C55E', letterSpacing:'-0.02em' }}>
              ${Number(entry.earned).toFixed(0)}
            </span>
          )}
          <div style={{
            width:26, height:26, borderRadius:8, background:'var(--bg3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            transform: open ? 'rotate(90deg)' : 'none',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width:14, height:14, color:'var(--t3)' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop:`1px solid ${color}25`, padding:'16px 16px 18px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Earned */}
          {entry.earned>0 && (
            <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:10, padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--t3)' }}>Earned today</span>
              <span style={{ fontSize:16, fontWeight:800, color:'#22C55E' }}>💰 ${Number(entry.earned).toFixed(2)}</span>
            </div>
          )}

          {/* Notes */}
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={color}/>

          {/* Images */}
          <ImagesSection images={entry.images} accentColor={color}/>

          {/* Upload */}
          <div style={{ borderTop:'1px solid var(--sep)', paddingTop:14 }}>
            <PhotoUploader projectId={projectId} date={entry.date} accentColor={color} onUploaded={onRefresh}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Photos tab — all photos across all days ──────────────── */
function PhotosAll({ entries, color }) {
  const [lb, setLb] = useState(null);
  const byDate = {};
  entries.forEach(e=>{
    (e.images||[]).forEach(img=>{ byDate[e.date]=byDate[e.date]||[]; byDate[e.date].push({...img,date:e.date}); });
  });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  if (!dates.length) return (
    <div className="empty">
      <div className="empty-ico">📷</div>
      <div className="empty-title">No photos yet</div>
      <div className="empty-sub">Open a daily log entry and tap Before or After to add photos.</div>
    </div>
  );

  return (
    <div>
      {dates.map((date,di)=>{
        const imgs = byDate[date];
        const before = imgs.filter(i=>i.type==='before');
        const after  = imgs.filter(i=>i.type==='after');
        return (
          <div key={date}>
            {/* Date separator */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, marginTop: di>0?24:0 }}>
              <div style={{ width:3, height:16, background:color, borderRadius:2 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{fmtDate(date)}</div>
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>
                  {before.length>0 && `${before.length} before`}
                  {before.length>0 && after.length>0 && ' · '}
                  {after.length>0 && `${after.length} after`}
                </div>
              </div>
            </div>

            {/* Before group */}
            {before.length>0 && (
              <div style={{ marginBottom:after.length?12:0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#FBBF24', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>Before</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {before.map((img,idx)=>(
                    <div key={idx} className="ba-item" onClick={()=>setLb(img)} style={{ aspectRatio:'4/3' }}>
                      <img src={img.url} alt="Before" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                        onError={e=>{e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex';}}/>
                      <div style={{ display:'none', position:'absolute', inset:0, alignItems:'center', justifyContent:'center', background:'var(--bg3)', color:'var(--t4)', fontSize:24 }}>📷</div>
                      <span className="ba-tag" style={{ background:'rgba(251,191,36,0.85)' }}>Before</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* After group */}
            {after.length>0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#22C55E', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>After</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {after.map((img,idx)=>(
                    <div key={idx} className="ba-item" onClick={()=>setLb(img)} style={{ aspectRatio:'4/3' }}>
                      <img src={img.url} alt="After" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                        onError={e=>{e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex';}}/>
                      <div style={{ display:'none', position:'absolute', inset:0, alignItems:'center', justifyContent:'center', background:'var(--bg3)', color:'var(--t4)', fontSize:24 }}>📷</div>
                      <span className="ba-tag" style={{ background:'rgba(34,197,94,0.85)' }}>After</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Separator line between days */}
            {di < dates.length-1 && (
              <div style={{ height:1, background:'var(--sep)', marginTop:20 }}/>
            )}
          </div>
        );
      })}

      {lb && (
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close" onClick={e=>{e.stopPropagation();setLb(null)}}>✕</button>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <img src={lb.url} className="lb-img" alt=""/>
            {lb.caption && <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>{lb.caption}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { projects, entries, categories, loading, refresh } = useLogs();
  const [tab, setTab] = useState('log');

  if (!id||loading) return (
    <div className="app">
      <div style={{ padding:'20px 16px', paddingTop:'calc(env(safe-area-inset-top,0px)+72px)' }}>
        {[180,80,80,200].map((h,i)=><div key={i} className="skel" style={{ height:h, borderRadius:18, marginBottom:12 }}/>)}
      </div>
    </div>
  );

  const project = projects.find(p=>p.id===id);
  if (!project) return (
    <div className="app">
      <div className="empty" style={{ paddingTop:100 }}>
        <div className="empty-ico">❓</div>
        <div className="empty-title">Project not found</div>
        <button onClick={()=>router.push('/')} className="btn btn-ghost" style={{ marginTop:16 }}>← Back</button>
      </div>
    </div>
  );

  const pEntries = entries.filter(e=>e.project===id).sort((a,b)=>b.date.localeCompare(a.date));
  const hrs = totalHours(pEntries);
  const earned = totalEarned(pEntries);
  const streak = getStreak(pEntries);
  const today = todayStr();
  const {start:ws,end:we} = getWeekRange(today);
  const weekH = totalHours(pEntries.filter(e=>e.date>=ws&&e.date<=we));
  const color = project.color;
  const totalImgs = pEntries.reduce((s,e)=>s+(e.images||[]).length,0);

  return (
    <div className="app">
      {/* Header */}
      <header className="hdr" style={{ borderBottom:`1px solid ${color}20` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>router.push('/')} className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width:15, height:15 }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:`${color}20`, border:`1px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
              {project.icon}
            </div>
            <div>
              <div className="hdr-title">{project.name}</div>
              <div className="hdr-sub">{project.client} · Since {fmtShort(project.startDate)}</div>
            </div>
          </div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:9999, background:`${color}18`, color, flexShrink:0 }}>Active</span>
      </header>

      <main className="main">

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
          {[
            {val:`${hrs.toFixed(1)}h`, lbl:'Hours', c:color},
            {val:pEntries.length, lbl:'Days', c:'var(--t1)'},
            {val:`${streak}🔥`, lbl:'Streak', c:'var(--t1)'},
            {val:`$${earned.toFixed(0)}`, lbl:'Earned', c:'#22C55E'},
          ].map(({val,lbl,c})=>(
            <div key={lbl} className="tile" style={{ padding:'11px 6px', alignItems:'center', textAlign:'center' }}>
              <span className="tile-val" style={{ fontSize:15, color:c }}>{val}</span>
              <span className="tile-lbl" style={{ fontSize:9 }}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="card card-p" style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div className="lbl" style={{ marginBottom:2 }}>Work Activity</div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>
                {pEntries.length} days logged
                {weekH>0 ? ` · ${weekH.toFixed(1)}h this week` : ''}
              </div>
            </div>
          </div>
          <Heatmap entries={pEntries} color={color}/>
        </div>

        {/* Tab toggle */}
        <div className="ptog" style={{ marginBottom:18 }}>
          <button className={`pbtn${tab==='log'?' on':''}`} onClick={()=>setTab('log')}>
            Work Log ({pEntries.length})
          </button>
          <button className={`pbtn${tab==='photos'?' on':''}`} onClick={()=>setTab('photos')}>
            Photos{totalImgs>0?` (${totalImgs})`:''}
          </button>
        </div>

        {tab==='log' && (
          pEntries.length===0 ? (
            <div className="empty">
              <div className="empty-ico">📋</div>
              <div className="empty-title">No logs yet</div>
              <div className="empty-sub">Tell me what you worked on and I'll add the first entry.</div>
            </div>
          ) : pEntries.map(e=>(
            <EntryCard
              key={e.date} entry={e} categories={categories}
              color={color} projectId={id}
              onRefresh={() => { refresh(); }}
            />
          ))
        )}

        {tab==='photos' && <PhotosAll entries={pEntries} color={color}/>}
      </main>

      {/* Bottom nav */}
      <nav className="bnav">
        {[
          {href:'/',label:'Projects',icon:'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9'},
          {href:'/timeline',label:'Timeline',icon:'M3 4h18v16H3z M16 2v4 M8 2v4 M3 10h18',rect:true},
          {href:'/stats',label:'Stats',icon:'M18 20v-10 M12 20v-16 M6 20v-6'},
          {href:'/journal',label:'Journal',icon:'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'},
        ].map(({href,label,icon,rect})=>(
          <Link key={href} href={href} className={`bnav-item${href==='/'?' active':''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}>
              {rect ? <>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </> : icon.split(' M').filter(Boolean).map((d,i)=><path key={i} d={(i===0?'':' M')+d}/>)}
            </svg>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

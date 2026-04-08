import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotesRenderer from '../../components/NotesRenderer';
import { useLogs, fmtDate, fmtShort, totalHours, totalEarned, getCatStyle, getStreak, getWeekRange, todayStr } from '../../lib/data';

function MiniHeatmap({ entries, color }) {
  // Last 10 weeks = 70 days, shown as 10 columns × 7 rows
  const today = new Date(); today.setHours(12,0,0,0);
  const map = {};
  entries.forEach(e => { map[e.date] = parseFloat(e.hours)||0; });
  const todayStr_ = today.toISOString().split('T')[0];

  // Build 70 days
  const days = Array.from({length:70},(_,i)=>{
    const d = new Date(today); d.setDate(today.getDate()-69+i);
    const str = d.toISOString().split('T')[0];
    return { str, h: map[str]||0, isToday: str===todayStr_ };
  });

  const maxH = Math.max(...days.map(d=>d.h), 1);

  function opacity(h) {
    if (!h) return 0.08;
    return 0.25 + (h/maxH)*0.75;
  }

  return (
    <div style={{display:'flex',gap:3,overflowX:'auto',paddingBottom:2}}>
      {/* group into columns of 7 */}
      {Array.from({length:10},(_,col)=>(
        <div key={col} style={{display:'flex',flexDirection:'column',gap:3}}>
          {days.slice(col*7,col*7+7).map((day,row)=>(
            <div key={row} style={{
              width:20,height:20,borderRadius:5,
              background:day.h ? color : 'var(--bg3)',
              opacity:day.h ? opacity(day.h) : 1,
              outline: day.isToday ? `2px solid ${color}` : 'none',
              outlineOffset:1,
              transition:'opacity 0.2s',
              position:'relative',
            }} title={`${day.str}: ${day.h}h`}/>
          ))}
        </div>
      ))}
    </div>
  );
}

function ImagesSection({ images, accentColor }) {
  const [lb, setLb] = useState(null);

  const before = (images||[]).filter(i => i.type === 'before');
  const after  = (images||[]).filter(i => i.type === 'after');
  const hasAny = before.length > 0 || after.length > 0;

  if (!hasAny) return (
    <div style={{
      background:'var(--bg3)', borderRadius:12,
      padding:'20px 16px', textAlign:'center',
    }}>
      <div style={{fontSize:28,marginBottom:8}}>📷</div>
      <div style={{fontSize:13,fontWeight:600,color:'var(--t3)'}}>No photos for this day yet</div>
      <div style={{fontSize:11,color:'var(--t4)',marginTop:4}}>Share photos in chat to add them here</div>
    </div>
  );

  const Group = ({imgs, label}) => {
    if (!imgs.length) return null;
    return (
      <div style={{marginBottom: label==='Before'&&after.length?16:0}}>
        <div style={{fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.10em',marginBottom:8}}>{label}</div>
        <div style={{display:'grid',gridTemplateColumns:imgs.length===1?'1fr':'1fr 1fr',gap:8}}>
          {imgs.map((img,idx)=>(
            <div key={idx} className="ba-item" onClick={()=>setLb(img)}
              style={{aspectRatio:imgs.length===1?'16/9':'4/3'}}>
              <img src={img.url} alt={img.caption||label} loading="lazy"
                style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                onError={e=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex';}}
              />
              <div style={{display:'none',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',color:'var(--t4)',fontSize:22,background:'var(--bg3)',position:'absolute',inset:0}}>📷</div>
              {img.caption&&<span className="ba-tag">{img.caption}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Group imgs={before} label="Before"/>
      <Group imgs={after} label="After"/>
      {lb&&(
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close" onClick={e=>{e.stopPropagation();setLb(null)}}>✕</button>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,maxWidth:'100%'}}>
            <img src={lb.url} className="lb-img" alt={lb.caption||''}/>
            {lb.caption&&<span style={{color:'rgba(255,255,255,0.55)',fontSize:13,fontWeight:500,textAlign:'center'}}>{lb.caption}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, categories, color }) {
  const [open, setOpen] = useState(false);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours)||0;
  const today = todayStr();
  const isToday = entry.date === today;
  const imgCount = (entry.images||[]).length;

  return (
    <div className="ecard fu">
      <div className="ecard-hdr" onClick={()=>setOpen(o=>!o)}>
        <div className="hrs-badge" style={{background:color}}>
          <span className="hv">{h%1===0?h:h.toFixed(1)}</span>
          <span className="hl">HRS</span>
        </div>
        <div className="ecard-info">
          <div className="ecard-date" style={{color:isToday?color:'var(--t1)'}}>
            {isToday?'Today — ':''}{fmtDate(entry.date)}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7,marginTop:3,flexWrap:'wrap'}}>
            <span className="chip" style={{background:cat.color+'20',color:cat.color,padding:'2px 8px',fontSize:10}}>
              {cat.icon} {cat.name}
            </span>
            {imgCount>0&&<span style={{fontSize:10,color:'var(--t4)'}}>📷 {imgCount}</span>}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
          {entry.earned>0&&<span style={{fontSize:13,fontWeight:800,color:'#22C55E',fontFamily:'var(--mono)'}}>
            ${Number(entry.earned).toFixed(0)}
          </span>}
          <span className={`chevron${open?' open':''}`}>›</span>
        </div>
      </div>

      {open&&(
        <div className="ecard-body">
          {entry.earned>0&&(
            <div style={{background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:10,padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,fontWeight:600,color:'var(--t3)'}}>Earned today</span>
              <span className="earned-pill">💰 ${Number(entry.earned).toFixed(2)}</span>
            </div>
          )}
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={color}/>
          <ImagesSection images={entry.images} accentColor={color}/>
        </div>
      )}
    </div>
  );
}

function PhotosAll({ entries, color }) {
  const [lb, setLb] = useState(null);
  const allImgs = entries.flatMap(e=>(e.images||[]).map(img=>({...img,date:e.date})));

  if (allImgs.length===0) return (
    <div className="empty">
      <div className="empty-ico">📷</div>
      <div className="empty-title">No photos yet</div>
      <div className="empty-sub">Share before/after photos in chat — I'll attach them to your logs here.</div>
    </div>
  );

  // Group by date
  const byDate = {};
  allImgs.forEach(img=>{ byDate[img.date]=byDate[img.date]||[]; byDate[img.date].push(img); });

  return (
    <div>
      {Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,imgs])=>(
        <div key={date} style={{marginBottom:22}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--t3)',marginBottom:10,display:'flex',alignItems:'center',gap:7}}>
            <div style={{width:3,height:12,background:color,borderRadius:2}}/>
            {fmtDate(date)} · {imgs.length} photo{imgs.length>1?'s':''}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {imgs.map((img,idx)=>(
              <div key={idx} className="ba-item" onClick={()=>setLb(img)} style={{aspectRatio:'4/3'}}>
                <img src={img.url} alt={img.caption||img.type} loading="lazy"
                  style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                  onError={e=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex';}}
                />
                <div style={{display:'none',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',color:'var(--t4)',fontSize:28,background:'var(--bg3)',position:'absolute',inset:0}}>📷</div>
                <span className="ba-tag" style={{background:img.type==='before'?'rgba(251,191,36,0.8)':'rgba(34,197,94,0.8)'}}>
                  {img.type==='before'?'Before':'After'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {lb&&(
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close" onClick={e=>{e.stopPropagation();setLb(null)}}>✕</button>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
            <img src={lb.url} className="lb-img" alt={lb.caption||''}/>
            {lb.caption&&<span style={{color:'rgba(255,255,255,0.55)',fontSize:13,fontWeight:500}}>{lb.caption}</span>}
          </div>
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

  if (!id||loading) return (
    <div className="app">
      <div style={{padding:'20px 16px',paddingTop:'calc(env(safe-area-inset-top,0px)+80px)'}}>
        <div className="skel" style={{height:56,borderRadius:16,marginBottom:16}}/>
        <div className="skel" style={{height:100,borderRadius:16,marginBottom:12}}/>
        <div className="skel" style={{height:200,borderRadius:16}}/>
      </div>
    </div>
  );

  const project = projects.find(p=>p.id===id);
  if (!project) return (
    <div className="app">
      <div className="empty" style={{paddingTop:100}}>
        <div className="empty-ico">❓</div>
        <div className="empty-title">Project not found</div>
        <button onClick={()=>router.push('/')} className="btn btn-ghost" style={{marginTop:16}}>← Back</button>
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
      <header className="hdr" style={{borderBottom:`1px solid ${color}25`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/')} className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:16,height:16}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:32,height:32,borderRadius:9,background:`${color}22`,border:`1px solid ${color}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>
              {project.icon}
            </div>
            <div>
              <div className="hdr-title">{project.name}</div>
              <div className="hdr-sub">{project.client}</div>
            </div>
          </div>
        </div>
        <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:9999,background:`${color}18`,color,flexShrink:0}}>Active</span>
      </header>

      <main className="main">

        {/* Stats bar */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:18}}>
          {[
            {val:`${hrs.toFixed(1)}h`,lbl:'Hours',c:color},
            {val:pEntries.length,lbl:'Days',c:'var(--t1)'},
            {val:`${streak}🔥`,lbl:'Streak',c:'var(--t1)'},
            {val:`$${earned.toFixed(0)}`,lbl:'Earned',c:'#22C55E'},
          ].map(({val,lbl,c})=>(
            <div key={lbl} className="tile" style={{padding:'11px 8px',alignItems:'center',textAlign:'center'}}>
              <span className="tile-val" style={{fontSize:16,color:c}}>{val}</span>
              <span className="tile-lbl" style={{fontSize:9}}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="card card-p" style={{marginBottom:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <div className="lbl" style={{marginBottom:2}}>Work Activity</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>{weekH>0?`${weekH.toFixed(1)}h this week · `:''}Last 10 weeks</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,color:'var(--t4)',marginBottom:4}}>Less</div>
              <div style={{display:'flex',gap:3,alignItems:'center'}}>
                {[0.08,0.3,0.55,0.8,1].map((op,i)=>(
                  <div key={i} style={{width:10,height:10,borderRadius:3,background:i===0?'var(--bg3)':color,opacity:i===0?1:op}}/>
                ))}
              </div>
              <div style={{fontSize:11,color:'var(--t4)',marginTop:4}}>More</div>
            </div>
          </div>
          <MiniHeatmap entries={pEntries} color={color}/>
        </div>

        {/* Tab toggle */}
        <div className="ptog" style={{marginBottom:18}}>
          <button className={`pbtn${tab==='log'?' on':''}`} onClick={()=>setTab('log')}>
            Work Log ({pEntries.length})
          </button>
          <button className={`pbtn${tab==='photos'?' on':''}`} onClick={()=>setTab('photos')}>
            Photos {totalImgs>0?`(${totalImgs})`:''}
          </button>
        </div>

        {/* Log tab */}
        {tab==='log'&&(
          pEntries.length===0?(
            <div className="empty">
              <div className="empty-ico">📋</div>
              <div className="empty-title">No logs yet</div>
              <div className="empty-sub">Tell me what you worked on and I'll add the first entry.</div>
            </div>
          ):pEntries.map(e=><EntryCard key={e.date} entry={e} categories={categories} color={color}/>)
        )}

        {/* Photos tab */}
        {tab==='photos'&&<PhotosAll entries={pEntries} color={color}/>}

      </main>

      {/* Bottom nav */}
      <nav className="bnav">
        {[
          {href:'/',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,label:'Projects',active:true},
          {href:'/timeline',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,label:'Timeline'},
          {href:'/stats',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,label:'Stats'},
          {href:'/journal',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,label:'Journal'},
        ].map(({href,icon,label,active})=>(
          <Link key={href} href={href} className={`bnav-item${active?' active':''}`}>{icon}<span>{label}</span></Link>
        ))}
      </nav>
    </div>
  );
}

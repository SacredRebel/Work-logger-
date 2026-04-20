import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotesRenderer from '../../components/NotesRenderer';
import PhotoUploader from '../../components/PhotoUploader';
import Lightbox from '../../components/Lightbox';
import BillingTab from '../../components/BillingTab';
import { computePayStatus, PayBadge, getPaymentsForDay } from '../../lib/billing';
import { useLogs, fmtDate, fmtShort, totalHours, totalEarned, getCatStyle, getStreak, getWeekRange, todayStr } from '../../lib/data';

/* ── Heatmap ─────────────────────────────────────────────── */
function Heatmap({ entries, color }) {
  const today = new Date(); today.setHours(12,0,0,0);
  const todayStr_ = today.toISOString().split('T')[0];
  const map = {};
  entries.forEach(e => { map[e.date] = parseFloat(e.hours)||0; });
  const days = Array.from({length:84},(_,i)=>{
    const d = new Date(today); d.setDate(today.getDate()-83+i);
    const str = d.toISOString().split('T')[0];
    return { str, h:map[str]||0, isToday:str===todayStr_ };
  });
  const maxH = Math.max(...days.map(d=>d.h), 1);
  const months = Array.from({length:12},(_,col)=>{
    const d = days[col*7];
    return new Date(d.str+'T12:00:00').toLocaleDateString('en-US',{month:'short'});
  });
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',marginBottom:5}}>
        {months.map((m,i)=><div key={i} style={{fontSize:9,fontWeight:600,color:'var(--t4)',letterSpacing:'0.04em'}}>{m}</div>)}
      </div>
      <div style={{display:'flex',gap:6}}>
        <div style={{display:'flex',flexDirection:'column',gap:3,paddingTop:1}}>
          {['M','','W','','F','','S'].map((l,i)=><div key={i} style={{height:11,fontSize:8,fontWeight:600,color:'var(--t4)',lineHeight:'11px'}}>{l}</div>)}
        </div>
        <div style={{display:'grid',gridAutoFlow:'column',gridTemplateRows:'repeat(7,11px)',gap:3,flex:1}}>
          {days.map((day,i)=>(
            <div key={i} title={`${day.str}: ${day.h}h`} style={{
              width:'100%',height:11,borderRadius:3,
              background:day.h?color:'var(--s3)',
              opacity:day.h?(0.20+(day.h/maxH)*0.80):1,
              outline:day.isToday?`2px solid ${color}`:'none',outlineOffset:1,
            }}/>
          ))}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:8,justifyContent:'flex-end'}}>
        <span style={{fontSize:9,color:'var(--t4)',fontWeight:600}}>Less</span>
        {[0,0.25,0.5,0.75,1].map((op,i)=>(
          <div key={i} style={{width:10,height:10,borderRadius:3,background:i===0?'var(--s3)':color,opacity:i===0?1:0.2+op*0.8}}/>
        ))}
        <span style={{fontSize:9,color:'var(--t4)',fontWeight:600}}>More</span>
      </div>
    </div>
  );
}

/* ── Image grid — grouped, Before left / After right ──────── */
function ImageGrid({ images: initialImages, color, projectId, date, onImageDeleted }) {
  const [images, setImages] = useState(initialImages);
  const [lb, setLb] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragIdx = useRef(null);
  const dragType = useRef(null);

  const initKey = initialImages.map(i=>i.url).join(',');
  const localKey = images.map(i=>i.url).join(',');
  if (initKey !== localKey && initialImages.length >= images.length) setImages(initialImages);

  function handleDelete(url) {
    setImages(prev => prev.filter(i => i.url !== url));
    setLb(null);
    if (onImageDeleted) onImageDeleted(url);
  }

  async function saveOrder(newImages) {
    setSaving(true);
    try {
      await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-images',
          payload: { date, project: projectId, images: newImages }
        })
      });
    } catch(e) {}
    setSaving(false);
  }

  function moveImage(type, fromIdx, toIdx) {
    setImages(prev => {
      const typed = prev.filter(i => i.type === type);
      const others = prev.filter(i => i.type !== type);
      const moved = [...typed];
      const [item] = moved.splice(fromIdx, 1);
      moved.splice(toIdx, 0, item);
      // Rebuild: preserve original interleaving order but replace typed array
      const result = [];
      let ti = 0;
      prev.forEach(img => {
        if (img.type === type) result.push(moved[ti++]);
        else result.push(img);
      });
      saveOrder(result);
      return result;
    });
  }

  if (!images.length) return null;

  const groupMap = {};
  images.forEach(img => {
    const key = img.group || img.caption || 'Photos';
    if (!groupMap[key]) groupMap[key] = { before: [], after: [] };
    if (img.type === 'before') groupMap[key].before.push(img);
    else groupMap[key].after.push(img);
  });
  const groups = Object.entries(groupMap);

  const SortableThumb = ({img, imgIdx, type, allInGroup, lbOffset, border}) => {
    const [dragging, setDragging] = useState(false);

    function onTouchStart(e) {
      if (!reordering) return;
      dragIdx.current = imgIdx;
      dragType.current = type;
      setDragging(true);
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'scale(0.95)';
    }
    function onTouchEnd(e) {
      if (!reordering) return;
      setDragging(false);
      e.currentTarget.style.opacity = '';
      e.currentTarget.style.transform = '';
      // Find drop target by touch position
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el?.closest('[data-imgidx]');
      if (target && target.dataset.imgtype === type) {
        const toIdx = parseInt(target.dataset.imgidx);
        if (toIdx !== dragIdx.current) moveImage(type, dragIdx.current, toIdx);
      }
      dragIdx.current = null;
    }

    return (
      <div
        data-imgidx={imgIdx}
        data-imgtype={type}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => !reordering && setLb({images:allInGroup, startIdx:lbOffset+imgIdx})}
        style={{position:'relative',borderRadius:12,overflow:'hidden',aspectRatio:'4/3',
          background:'var(--s3)',cursor:reordering?'grab':'pointer',
          boxShadow:'0 2px 10px rgba(0,0,0,0.12)',border,
          transition:'opacity 0.15s, transform 0.15s',
          userSelect:'none', WebkitUserSelect:'none'}}>
        <img src={img.url} alt={img.type} loading="lazy"
          style={{width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none'}}
          onError={e=>{e.target.style.display='none';}}/>
        {/* Before/After badge */}
        <div style={{position:'absolute',top:6,
          left:type==='before'?6:'auto', right:type==='after'?6:'auto',
          background:type==='before'?'rgba(251,191,36,0.92)':'rgba(34,197,94,0.92)',
          backdropFilter:'blur(4px)',color:'#fff',fontSize:8,fontWeight:900,
          letterSpacing:'0.10em',textTransform:'uppercase',padding:'3px 7px',borderRadius:9999}}>
          {type==='before'?'Before':'After'}
        </div>
        {/* Drag handle — only in reorder mode */}
        {reordering && (
          <div style={{position:'absolute',bottom:5,right:5,
            background:'rgba(0,0,0,0.5)',borderRadius:6,padding:'3px 5px',
            fontSize:12,color:'rgba(255,255,255,0.9)'}}>⠿</div>
        )}
        {/* Order number */}
        {reordering && (
          <div style={{position:'absolute',top:6,right:type==='before'?6:'auto',
            left:type==='after'?6:'auto',
            background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:10,fontWeight:800,
            width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {imgIdx+1}
          </div>
        )}
      </div>
    );
  };

  const Empty = ({color:c, label}) => (
    <div style={{aspectRatio:'4/3',borderRadius:12,border:`1.5px dashed ${c}30`,
      background:`${c}04`,display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:4}}>
      <span style={{fontSize:16,opacity:0.25}}>{label==='before'?'📸':'✅'}</span>
      <span style={{fontSize:9,color:'var(--t4)',fontWeight:600}}>No {label}</span>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:18}}>
      {groups.map(([groupName, {before, after}]) => {
        const allInGroup = [...before,...after];
        return (
          <div key={groupName}>
            {/* Group header + reorder toggle */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:3,height:14,background:color,borderRadius:2}}/>
                <span style={{fontSize:12,fontWeight:800,color:'var(--t1)'}}>{groupName}</span>
                <span style={{fontSize:10,color:'var(--t4)'}}>
                  {before.length>0&&`${before.length}B`}
                  {before.length>0&&after.length>0&&' · '}
                  {after.length>0&&`${after.length}A`}
                </span>
              </div>
              {allInGroup.length > 1 && (
                <button onClick={()=>setReordering(r=>!r)} style={{
                  fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:9999,
                  border:`1px solid ${reordering?color:'var(--bdr)'}`,
                  background:reordering?color:'transparent',
                  color:reordering?'#fff':'var(--t3)',
                  fontFamily:'inherit',cursor:'pointer',
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  {saving ? '💾 Saving…' : reordering ? '✓ Done' : '⠿ Reorder'}
                </button>
              )}
            </div>
            {reordering && (
              <div style={{fontSize:11,color:'var(--t3)',marginBottom:8,textAlign:'center'}}>
                Hold & drag photos to reorder
              </div>
            )}
            {/* Column headers */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:5}}>
              <div style={{fontSize:9,fontWeight:800,color:'#FBBF24',textTransform:'uppercase',letterSpacing:'0.08em',textAlign:'center'}}>Before</div>
              <div style={{fontSize:9,fontWeight:800,color:'#22C55E',textTransform:'uppercase',letterSpacing:'0.08em',textAlign:'center'}}>After</div>
            </div>
            {/* Images */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {before.length>0
                  ? before.map((img,i)=><SortableThumb key={img.url} img={img} imgIdx={i} type="before" allInGroup={allInGroup} lbOffset={0} border="1.5px solid rgba(251,191,36,0.3)"/>)
                  : <Empty color="#FBBF24" label="before"/>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {after.length>0
                  ? after.map((img,i)=><SortableThumb key={img.url} img={img} imgIdx={i} type="after" allInGroup={allInGroup} lbOffset={before.length} border="1.5px solid rgba(34,197,94,0.3)"/>)
                  : <Empty color="#22C55E" label="after"/>}
              </div>
            </div>
          </div>
        );
      })}
      {lb && (
        <Lightbox images={lb.images} startIndex={Math.min(lb.startIdx,lb.images.length-1)}
          onClose={()=>setLb(null)} onDelete={handleDelete} projectId={projectId} date={date}/>
      )}
    </div>
  );
}

/* ── Entry card — expand/collapse inline, NO navigation ──── */
function EntryCard({ entry, categories, color, projectId, onRefresh, payStatus, payments, allEntries }) {
  const [open, setOpen] = useState(false);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours)||0;
  const isToday = entry.date === todayStr();
  const imgCount = (entry.images||[]).length;

  return (
    <div style={{
      background:'var(--s1)', borderRadius:18, overflow:'hidden', marginBottom:12,
      border:`1px solid ${open?color+'45':'var(--bdr)'}`,
      boxShadow:open?`0 8px 32px ${color}15, var(--shd)`:'var(--shd)',
      transition:'border-color 0.25s, box-shadow 0.25s',
    }}>
      {/* Header — tap to toggle, no routing */}
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:12, padding:'15px 16px',
        cursor:'pointer', userSelect:'none',
        background:open?`${color}06`:'transparent', transition:'background 0.2s',
      }}>
        <div style={{width:4,height:50,borderRadius:2,background:color,flexShrink:0,
          opacity:open?1:0.4, transition:'opacity 0.25s'}}/>
        <div style={{width:50,height:50,borderRadius:14,flexShrink:0,
          background:`linear-gradient(135deg,${color},${color}bb)`,
          boxShadow:`0 3px 10px ${color}40`,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:16,fontWeight:800,color:'#fff',lineHeight:1}}>{h%1===0?h:h.toFixed(1)}</span>
          <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.65)',letterSpacing:'0.05em',marginTop:1}}>HRS</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:isToday?color:'var(--t1)',letterSpacing:'-0.01em',marginBottom:4}}>
            {isToday?'🟢 Today — ':''}{new Date(entry.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <span style={{fontSize:11,fontWeight:600,color:'var(--t3)',background:'var(--s2)',padding:'2px 8px',borderRadius:99,border:'1px solid var(--bdr)'}}>
              {cat.icon} {cat.name}
            </span>
            {imgCount>0&&<span style={{fontSize:11,color:'var(--t4)'}}>📷 {imgCount}</span>}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
          {entry.earned>0&&(
            <span style={{fontSize:14,fontWeight:800,color:'#22C55E',letterSpacing:'-0.02em'}}>
              ${Number(entry.earned).toFixed(0)}
            </span>
          )}
          {payStatus && <PayBadge status={payStatus} small={true}/>}
          {/* Animated chevron */}
          <div style={{width:28,height:28,borderRadius:9,background:'var(--s3)',border:'1px solid var(--bdr)',
            display:'flex',alignItems:'center',justifyContent:'center',
            transition:'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            transform:open?'rotate(90deg)':'none'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{width:13,height:13,color:'var(--t3)'}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Body — animated slide open */}
      <div style={{
        display:'grid',
        gridTemplateRows:open?'1fr':'0fr',
        transition:'grid-template-rows 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{overflow:'hidden'}}>
          <div style={{borderTop:`1px solid ${color}20`,padding:'16px 16px 18px',display:'flex',flexDirection:'column',gap:16}}>
            {/* Notes */}
            <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={color}/>

            {/* Payment section — always shown if entry has an earned amount */}
            {entry.earned > 0 && (()=>{
              const dayPay = getPaymentsForDay(payments||[], allEntries||[], entry.date);
              const hasCoverage = dayPay.covered > 0 && dayPay.payments.length > 0;
              return (
                <div style={{borderRadius:14,overflow:'hidden',border:`1px solid ${payStatus==='paid'?'rgba(34,197,94,0.25)':payStatus==='partial'?'rgba(251,191,36,0.25)':'rgba(239,68,68,0.2)'}`}}>
                  {/* Header */}
                  <div style={{padding:'10px 14px',background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--bdr)'}}>
                    <span style={{fontSize:11,fontWeight:800,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>💳 Payment</span>
                    <PayBadge status={payStatus} small={true}/>
                  </div>
                  <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
                    {/* Amount due row */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:12,color:'var(--t3)',fontWeight:600}}>Amount due</span>
                      <span style={{fontSize:15,fontWeight:800,color:'var(--t1)',fontFamily:'var(--mono)'}}>
                        ${Number(entry.earned).toFixed(2)}
                      </span>
                    </div>
                    {/* Payment details */}
                    {hasCoverage ? (
                      <div style={{borderTop:'1px solid var(--bdr)',paddingTop:10,display:'flex',flexDirection:'column',gap:8}}>
                        {dayPay.payments.map((p,i)=>(
                          <div key={i}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:9999,
                                  background:'rgba(34,197,94,0.12)',color:'#22C55E'}}>
                                  {p.method}
                                </span>
                                <span style={{fontSize:11,color:'var(--t3)'}}>
                                  {new Date(p.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                                </span>
                              </div>
                              <span style={{fontSize:14,fontWeight:800,color:'#22C55E',fontFamily:'var(--mono)'}}>
                                +${p.amount.toFixed(2)}
                              </span>
                            </div>
                            {p.note && (
                              <div style={{fontSize:11,color:'var(--t4)',lineHeight:1.55,paddingLeft:2}}>{p.note}</div>
                            )}
                          </div>
                        ))}
                        {payStatus==='partial' && dayPay.outstanding > 0 && (
                          <div style={{borderTop:'1px solid var(--bdr)',paddingTop:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <span style={{fontSize:12,fontWeight:600,color:'#FBBF24'}}>Still outstanding</span>
                            <span style={{fontSize:14,fontWeight:800,color:'#FBBF24',fontFamily:'var(--mono)'}}>
                              ${dayPay.outstanding.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{borderTop:'1px solid var(--bdr)',paddingTop:10,
                        fontSize:12,color:'var(--t4)',lineHeight:1.5}}>
                        Not yet paid · will update when payment received
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Images */}
            <ImageGrid
              images={entry.images||[]}
              color={color}
              projectId={projectId}
              date={entry.date}
              onImageDeleted={onRefresh}
            />

            {/* Upload photos */}
            <div style={{borderTop:'1px solid var(--bdr)',paddingTop:14}}>
              <PhotoUploader projectId={projectId} date={entry.date} accentColor={color} existingGroups={[...new Set((entry.images||[]).map(i=>i.group||i.caption).filter(Boolean))]} onUploaded={(newImgs) => {
                entry.images = [...(entry.images||[]), ...newImgs];
                onRefresh();
              }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Photos tab with local delete state ───────────────────── */
function PhotosTab({ entries: initialEntries, color, projectId }) {
  const [deletedUrls, setDeletedUrls] = useState(new Set());
  const [lb, setLb] = useState(null);

  // Filter out deleted images from live prop data
  const entries = initialEntries.map(e => ({
    ...e,
    images: (e.images||[]).filter(i => !deletedUrls.has(i.url))
  }));

  function handleDelete(url) {
    setDeletedUrls(prev => new Set([...prev, url]));
    setLb(null);
  }

  const byDate = {};
  entries.forEach(e => {
    const imgs = e.images||[];
    if (imgs.length) byDate[e.date] = { imgs, date: e.date };
  });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  if (!dates.length) return (
    <div className="empty">
      <div className="empty-ico">📷</div>
      <div className="empty-title">No photos yet</div>
      <div className="empty-sub">Open a daily log and tap Before or After to add photos.</div>
    </div>
  );

  return (
    <div>
      {dates.map((date, di)=>{
        const {imgs} = byDate[date];
        const before = imgs.filter(i=>i.type==='before');
        const after  = imgs.filter(i=>i.type==='after');
        const ordered = [...before,...after];

        const Row = ({list, label, tagBg, offset}) => {
          if (!list.length) return null;
          return (
            <div style={{marginBottom:label==='Before'&&after.length?12:0}}>
              <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',
                marginBottom:7,color:label==='Before'?'#FBBF24':'#22C55E'}}>
                {label} · {list.length}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {list.map((img,idx)=>(
                  <div key={img.url} onClick={()=>setLb({images:ordered,startIdx:offset+idx,date})}
                    style={{position:'relative',borderRadius:14,overflow:'hidden',aspectRatio:'4/3',
                      background:'var(--s3)',cursor:'pointer',boxShadow:'0 2px 12px rgba(0,0,0,0.12)'}}>
                    <img src={img.url} alt={label} loading="lazy"
                      style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                      onError={e=>{e.target.style.display='none';}}/>
                    <div style={{position:'absolute',
                      left: label==='Before' ? 7 : 'auto',
                      right: label==='After'  ? 7 : 'auto',
                      top:7,
                      background:tagBg,
                      backdropFilter:'blur(4px)',
                      color:'#fff',fontSize:8,fontWeight:900,letterSpacing:'0.10em',
                      textTransform:'uppercase',padding:'3px 7px',borderRadius:9999,
                      boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        };

        return (
          <div key={date}>
            {di>0&&<div style={{height:1,background:'var(--bdr)',margin:'20px 0'}}/>}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{width:3,height:18,background:color,borderRadius:2}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--t1)'}}>{fmtDate(date)}</div>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:1}}>
                  {before.length>0&&`${before.length} before`}
                  {before.length>0&&after.length>0&&' · '}
                  {after.length>0&&`${after.length} after`}
                </div>
              </div>
            </div>
            <Row list={before} label="Before" tagBg="rgba(251,191,36,0.88)" offset={0}/>
            <Row list={after}  label="After"  tagBg="rgba(34,197,94,0.88)"  offset={before.length}/>
          </div>
        );
      })}

      {lb&&(
        <Lightbox
          images={lb.images}
          startIndex={lb.startIdx}
          onClose={()=>setLb(null)}
          onDelete={handleDelete}
          projectId={projectId}
          date={lb.date}
        />
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
      <div style={{padding:'20px 16px',paddingTop:'calc(env(safe-area-inset-top,0px)+72px)'}}>
        {[72,100,200,80].map((h,i)=><div key={i} className="skel" style={{height:h,borderRadius:18,marginBottom:12}}/>)}
      </div>
    </div>
  );

  const project = projects.find(p=>p.id===id);
  if (!project) return (
    <div className="app">
      <div className="empty" style={{paddingTop:100}}>
        <div className="empty-ico">❓</div>
        <div className="empty-title">Project not found</div>
        <button onClick={()=>router.back()} className="btn btn-ghost" style={{marginTop:16}}>← Back</button>
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
  const payStatusMap = computePayStatus(project.payments, pEntries);

  return (
    <div className="app">
      <header className="hdr" style={{borderBottom:`1px solid ${color}20`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* router.back() so we return to the project list, not home */}
          <button onClick={()=>router.back()} className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:15,height:15}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:32,height:32,borderRadius:10,background:`${color}20`,border:`1px solid ${color}35`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>
              {project.icon}
            </div>
            <div>
              <div className="hdr-title">{project.name}</div>
              <div className="hdr-sub">{project.client} · Since {fmtShort(project.startDate)}</div>
            </div>
          </div>
        </div>
        <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:9999,
          background:`${color}18`,color,flexShrink:0}}>Active</span>
      </header>

      <main className="main">
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:18}}>
          {[
            {val:`${hrs.toFixed(1)}h`,lbl:'Hours',c:color},
            {val:pEntries.length,lbl:'Days',c:'var(--t1)'},
            {val:`${streak}🔥`,lbl:'Streak',c:'var(--t1)'},
            {val:`$${earned.toFixed(0)}`,lbl:'Earned',c:'#22C55E'},
          ].map(({val,lbl,c})=>(
            <div key={lbl} style={{background:'var(--s1)',borderRadius:14,border:'1px solid var(--bdr)',
              boxShadow:'var(--shd)',padding:'11px 6px',display:'flex',flexDirection:'column',
              alignItems:'center',textAlign:'center',gap:3}}>
              <span style={{fontSize:15,fontWeight:800,letterSpacing:'-0.03em',color:c,lineHeight:1}}>{val}</span>
              <span style={{fontSize:9,fontWeight:600,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div style={{background:'var(--s1)',borderRadius:18,border:'1px solid var(--bdr)',
          boxShadow:'var(--shd)',padding:'16px',marginBottom:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>Work Activity</div>
              <div style={{fontSize:11,color:'var(--t3)'}}>
                {pEntries.length} days · {weekH>0?`${weekH.toFixed(1)}h this week`:'no logs this week'}
              </div>
            </div>
          </div>
          <Heatmap entries={pEntries} color={color}/>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',background:'var(--s2)',borderRadius:14,padding:'3px',gap:2,
          marginBottom:18,border:'1px solid var(--bdr)'}}>
          {[{key:'log',label:`Work Log (${pEntries.length})`},{key:'photos',label:`Photos${totalImgs>0?` (${totalImgs})`:''}`},{key:'billing',label:'💰 Billing'}].map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              flex:1,padding:'8px 0',borderRadius:11,fontSize:12,fontWeight:700,
              fontFamily:'inherit',border:'none',cursor:'pointer',
              background:tab===key?'var(--s1)':'transparent',
              color:tab===key?'var(--t1)':'var(--t3)',
              boxShadow:tab===key?'0 1px 6px rgba(0,0,0,0.12)':'none',
              transition:'all 0.18s',
            }}>{label}</button>
          ))}
        </div>

        {tab==='log'&&(pEntries.length===0?(
          <div className="empty">
            <div className="empty-ico">📋</div>
            <div className="empty-title">No logs yet</div>
            <div className="empty-sub">Tell me what you worked on and I'll add the first entry.</div>
          </div>
        ):pEntries.map(e=>(
          <EntryCard key={e.date} entry={e} categories={categories} color={color} projectId={id} onRefresh={refresh} payStatus={payStatusMap[e.date]} payments={project.payments} allEntries={pEntries}/>
        )))}

        {tab==='photos'&&<PhotosTab entries={pEntries} color={color} projectId={id}/>}
        {tab==='billing'&&<BillingTab project={project} entries={pEntries} onMarkPaid={refresh}/>}
      </main>

      <nav className="bnav">
        {[
          {href:'/',label:'Projects',d:'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9'},
          {href:'/timeline',label:'Timeline',special:'cal'},
          {href:'/stats',label:'Stats',d:'M18 20v-10 M12 20v-16 M6 20v-6'},
          {href:'/journal',label:'Journal',d:'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'},
        ].map(({href,label,d,special})=>(
          <Link key={href} href={href} className={`bnav-item${href==='/'?' active':''}`}>
            {special==='cal'?(
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ):(
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{width:21,height:21,strokeWidth:1.75}}>
                {d.split(' M').filter(Boolean).map((seg,i)=><path key={i} d={(i===0?'':' M')+seg}/>)}
              </svg>
            )}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

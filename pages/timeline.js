import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, todayStr, fmtShort, fmtDate, totalHours, getCatStyle, getWeekRange } from '../lib/data';

const DLABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function weekDays(start) {
  return Array.from({length:7},(_,i)=>{ const d=new Date(start+'T12:00:00'); d.setDate(d.getDate()+i); return d.toISOString().split('T')[0]; });
}
function shift(start, n) {
  const d=new Date(start+'T12:00:00'); d.setDate(d.getDate()+n*7); return d.toISOString().split('T')[0];
}

export default function Timeline() {
  const { entries, categories, loading } = useLogs();
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(null);
  const [lb, setLb] = useState(null);
  const today = todayStr();
  const base = getWeekRange(today).start;
  const wStart = shift(base, offset);
  const days = weekDays(wStart);
  const wEnd = days[6];
  const wEntries = entries.filter(e=>e.date>=wStart&&e.date<=wEnd);
  const wH = totalHours(wEntries);

  const catMap={};
  wEntries.forEach(e=>{ const id=e.category||'general'; catMap[id]=(catMap[id]||0)+(parseFloat(e.hours)||0); });

  const hs = days.map(d=>{ const e=entries.find(e=>e.date===d); return e?parseFloat(e.hours)||0:0; });
  const peak = Math.max(...hs,1);

  return (
    <Layout title="Timeline" subtitle={`${fmtShort(wStart)} – ${fmtShort(wEnd)}`}>
      {loading ? (
        <>
          <div className="sk" style={{height:44,marginBottom:16}}/>
          <div className="sk" style={{height:170,marginBottom:14}}/>
          <div className="sk" style={{height:130,marginBottom:14}}/>
          <div className="sk" style={{height:200}}/>
        </>
      ) : (
        <>
          {/* Week nav */}
          <div className="wnav">
            <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o-1)}>‹ Prev</button>
            <div className="wnav-ctr">
              <div className="wnav-title" style={{color:offset===0?'var(--accent)':'var(--t1)'}}>
                {offset===0?'This Week':`${fmtShort(wStart)} – ${fmtShort(wEnd)}`}
              </div>
              <div className="wnav-sub">{wH.toFixed(1)}h · {wEntries.length} day{wEntries.length!==1?'s':''} logged</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o+1)} disabled={offset>=0} style={{opacity:offset>=0?.3:1}}>Next ›</button>
          </div>

          {/* Day bars */}
          <div className="card pad" style={{marginBottom:14}}>
            <div className="lbl">Hours per day</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,alignItems:'flex-end',height:120,marginBottom:8}}>
              {days.map((date,i)=>{
                const h=hs[i];
                const e=entries.find(e=>e.date===date);
                const cat=e?getCatStyle(categories,e.category):null;
                const isT=date===today;
                return (
                  <div key={date} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}>
                    {h>0&&<span style={{fontSize:9,fontWeight:700,color:cat?.color||'var(--t3)'}}>{h}h</span>}
                    <div style={{width:'100%',height:h?`${Math.max((h/peak)*90,5)}px`:'3px',background:h?cat?.color||'var(--accent)':'var(--s3)',borderRadius:'6px 6px 2px 2px',opacity:isT?1:0.72,transition:'height .35s'}}/>
                    <span style={{fontSize:10,fontWeight:isT?700:600,color:isT?'var(--accent)':'var(--t4)'}}>{DLABELS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(catMap).length>0&&(
            <div className="card pad" style={{marginBottom:14}}>
              <div className="lbl">By category</div>
              <div className="cat-rows">
                {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([id,h])=>{
                  const cat=getCatStyle(categories,id);
                  const pct=wH>0?(h/wH)*100:0;
                  return (
                    <div key={id}>
                      <div className="cat-row">
                        <div className="cat-dot" style={{background:cat.color}}/>
                        <span className="cat-name">{cat.icon} {cat.name}</span>
                        <span className="cat-val" style={{color:cat.color}}>{h.toFixed(1)}h</span>
                      </div>
                      <div className="cat-track"><div className="cat-fill" style={{width:`${pct}%`,background:cat.color}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day entries */}
          <div className="lbl">Daily log</div>
          {days.filter(d=>entries.find(e=>e.date===d)).length===0
            ? <div className="empty"><div className="empty-ico">📅</div><div className="empty-h">Nothing logged this week</div><div className="empty-s">Log hours and they'll appear here.</div></div>
            : days.map((date,i)=>{
                const entry=entries.find(e=>e.date===date);
                if(!entry) return null;
                const cat=getCatStyle(categories,entry.category);
                const h=parseFloat(entry.hours)||0;
                const isT=date===today;
                const isOpen=open===date;
                return (
                  <div key={date} className="ec fi">
                    <div className="ec-hdr" onClick={()=>setOpen(isOpen?null:date)}>
                      <div className="badge" style={{background:cat.color}}>
                        <span className="badge-v">{Number.isInteger(h)?h:h.toFixed(1)}</span>
                        <span className="badge-l">HRS</span>
                      </div>
                      <div className="ec-info">
                        <div className="ec-date" style={{color:isT?'var(--accent)':'var(--t1)'}}>
                          {isT?'Today':new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
                        </div>
                        <div className="ec-task">{entry.tasks||'No summary'}</div>
                      </div>
                      <span className={`caret${isOpen?' open':''}`}>›</span>
                    </div>
                    {isOpen&&(
                      <div className="ec-body">
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:7}}>
                          <span className="chip" style={{background:cat.color+'1A',color:cat.color}}>{cat.icon} {cat.name}</span>
                          {!!entry.earned&&<span className="earn-chip">💰 ${Number(entry.earned).toFixed(2)}</span>}
                        </div>
                        <NotesRenderer sections={entry.sections} notes={entry.notes} color={cat.color}/>
                      </div>
                    )}
                  </div>
                );
              })
          }
          {lb&&<div className="lb" onClick={()=>setLb(null)}><button className="lb-x">✕</button><img src={lb} alt="full"/></div>}
        </>
      )}
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useLogs, totalHours, getCatStyle } from '../lib/data';

function getLast(n) {
  const t = new Date(); t.setHours(12,0,0,0);
  return Array.from({length:n},(_,i)=>{
    const d=new Date(t); d.setDate(t.getDate()-(n-1)+i); return d.toISOString().split('T')[0];
  });
}

export default function Stats() {
  const { entries, categories, loading } = useLogs();
  const [period, setPeriod] = useState('week');
  const [ready, setReady] = useState(false);
  useEffect(()=>{ setReady(true); },[]);

  const days = ready ? (period==='week' ? getLast(7) : getLast(30)) : [];
  const pEntries = entries.filter(e=>days.includes(e.date));
  const pH = totalHours(pEntries);
  const loggedN = pEntries.length;
  const avgH = loggedN>0 ? pH/loggedN : 0;
  const bestH = pEntries.length>0 ? Math.max(...pEntries.map(e=>parseFloat(e.hours)||0)) : 0;
  const pEarned = pEntries.reduce((s,e)=>s+(Number(e.earned)||0),0);

  const catMap = {};
  pEntries.forEach(e=>{ const id=e.category||'general'; catMap[id]=(catMap[id]||0)+(parseFloat(e.hours)||0); });
  const catList = Object.entries(catMap).map(([id,h])=>{ const c=getCatStyle(categories,id); return {...c,h:parseFloat(h.toFixed(1))}; }).sort((a,b)=>b.h-a.h);

  const allH = totalHours(entries);
  const allEarned = entries.reduce((s,e)=>s+(Number(e.earned)||0),0);

  // Build bar data
  const barData = days.map(date=>{
    const e = entries.find(e=>e.date===date);
    const h = e ? parseFloat(e.hours)||0 : 0;
    const cat = e ? getCatStyle(categories,e.category) : null;
    const d = new Date(date+'T12:00:00');
    const label = period==='week'
      ? ['M','T','W','T','F','S','S'][d.getDay()===0?6:d.getDay()-1]
      : (d.getDate()===1||d.getDate()%7===0?`${d.getDate()}`:'');
    return { h, color:cat?.color||'var(--accent)', label };
  });
  const barPeak = Math.max(...barData.map(b=>b.h), 1);

  return (
    <Layout title="Analytics">
      {!ready || loading ? (
        <>
          <div className="sk" style={{height:44,marginBottom:16}}/>
          <div className="tile-grid">{[0,1,2].map(i=><div key={i} className="sk" style={{height:70}}/>)}</div>
          <div className="sk" style={{height:56,marginBottom:16}}/>
          <div className="sk" style={{height:150,marginBottom:16}}/>
          <div className="sk" style={{height:160}}/>
        </>
      ) : (
        <>
          {/* Period toggle + total */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <div className="ptog" style={{flex:1}}>
              <button className={`pbtn${period==='week'?' on':''}`} onClick={()=>setPeriod('week')}>7 days</button>
              <button className={`pbtn${period==='month'?' on':''}`} onClick={()=>setPeriod('month')}>30 days</button>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:21,fontWeight:800,letterSpacing:'-0.04em',color:'var(--t1)'}}>{pH.toFixed(1)}h</div>
              <div style={{fontSize:10,color:'var(--t3)',fontWeight:600}}>TOTAL</div>
            </div>
          </div>

          {/* Summary tiles */}
          <div className="tile-grid" style={{marginBottom:16}}>
            <div className="tile"><div className="tile-v" style={{fontSize:19}}>{avgH.toFixed(1)}h</div><div className="tile-l">Avg/day</div></div>
            <div className="tile"><div className="tile-v" style={{fontSize:19}}>{bestH.toFixed(1)}h</div><div className="tile-l">Best day</div></div>
            <div className="tile"><div className="tile-v" style={{fontSize:19}}>{loggedN}</div><div className="tile-l">Days logged</div></div>
          </div>

          {/* Earned */}
          {pEarned>0 && (
            <div className="earn-banner" style={{marginBottom:16}}>
              <div>
                <div className="earn-lbl">Earned ({period==='week'?'7 days':'30 days'})</div>
                <div className="earn-val">${pEarned.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
              </div>
              <span style={{fontSize:26}}>💰</span>
            </div>
          )}

          {/* Bar chart */}
          <div className="card pad" style={{marginBottom:14}}>
            <div className="lbl">Hours per day</div>
            <div className="bars">
              {barData.map((b,i)=>(
                <div key={i} className="bar-col">
                  {b.h>0 && <span style={{fontSize:8,fontWeight:700,color:b.color}}>{b.h}</span>}
                  <div className="bar-fill" style={{height:`${Math.max((b.h/barPeak)*88,2)}px`,background:b.h?b.color:'var(--s3)',opacity:b.h?1:1}}/>
                  <span className="bar-lbl">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {catList.length>0 && (
            <div className="card pad" style={{marginBottom:14}}>
              <div className="lbl">By category</div>
              <div className="cat-rows">
                {catList.map(cat=>{
                  const pct = pH>0?(cat.h/pH)*100:0;
                  return (
                    <div key={cat.name}>
                      <div className="cat-row">
                        <div className="cat-dot" style={{background:cat.color}}/>
                        <span className="cat-name">{cat.icon} {cat.name}</span>
                        <span className="cat-val" style={{color:cat.color}}>{cat.h}h · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="cat-track"><div className="cat-fill" style={{width:`${pct}%`,background:cat.color}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All time */}
          <div className="card pad">
            <div className="lbl">All time</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
              {[
                {v:`${allH.toFixed(0)}h`,l:'Hours logged',c:'var(--accent)'},
                {v:entries.length,l:'Days tracked',c:'var(--t1)'},
                {v:`$${allEarned.toFixed(0)}`,l:'Total earned',c:'var(--green)'},
              ].map(({v,l,c})=>(
                <div key={l}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-0.04em',color:c}}>{v}</div>
                  <div style={{fontSize:10,color:'var(--t3)',marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {entries.length===0 && (
            <div className="empty"><div className="empty-ico">📊</div><div className="empty-h">No data yet</div><div className="empty-s">Log some work and stats will appear here.</div></div>
          )}
        </>
      )}
    </Layout>
  );
}

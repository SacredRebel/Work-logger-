import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, fmtDate, getCatStyle, totalHours } from '../lib/data';
import { computePayStatus, PayBadge } from '../lib/billing';

async function makePDF(entries, categories, label) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  doc.setFillColor(10,10,10); doc.rect(0,0,210,297,'F');
  doc.setTextColor(255,107,53); doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('WORK LOG', 14, 20);
  doc.setFontSize(9); doc.setTextColor(110,110,110); doc.setFont('helvetica','normal');
  doc.text(label, 14, 28);
  doc.text(`Exported ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`, 14, 34);
  const rows = entries.map(e=>{
    const cat=getCatStyle(categories,e.category);
    return [
      new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),
      `${cat.name}`,
      `${parseFloat(e.hours).toFixed(1)}h`,
      e.earned?`$${Number(e.earned).toFixed(2)}`:'—',
      e.tasks||'',
    ];
  });
  autoTable(doc,{
    startY:42,
    head:[['Date','Category','Hours','Earned','Summary']],
    body:rows,
    theme:'plain',
    headStyles:{fillColor:[20,20,20],textColor:[255,107,53],fontSize:8,fontStyle:'bold',cellPadding:4},
    bodyStyles:{fillColor:[14,14,14],textColor:[190,190,190],fontSize:8,cellPadding:4},
    alternateRowStyles:{fillColor:[18,18,18]},
    columnStyles:{0:{cellWidth:26},1:{cellWidth:26},2:{cellWidth:14,halign:'center'},3:{cellWidth:18,halign:'center'},4:{cellWidth:'auto'}},
    margin:{left:14,right:14},
  });
  doc.save(`worklog-${new Date().toISOString().split('T')[0]}.pdf`);
}

function EntryCard({ entry, categories, payStatus }) {
  const [open, setOpen] = useState(false);
  const [lb, setLb] = useState(null);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours)||0;
  const before = entry.images?.find(i=>i.type==='before');
  const after  = entry.images?.find(i=>i.type==='after');
  const other  = entry.images?.filter(i=>i.type!=='before'&&i.type!=='after')||[];

  return (
    <div className="ec fi">
      <div className="ec-hdr" onClick={()=>setOpen(v=>!v)}>
        <div className="badge" style={{background:cat.color}}>
          <span className="badge-v">{Number.isInteger(h)?h:h.toFixed(1)}</span>
          <span className="badge-l">HRS</span>
        </div>
        <div className="ec-info">
          <div className="ec-date">{fmtDate(entry.date)}</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3,flexWrap:'wrap'}}>
            <span className="chip" style={{background:cat.color+'1A',color:cat.color}}>{cat.icon} {cat.name}</span>
            {entry.images?.length>0&&<span style={{fontSize:10,color:'var(--t4)'}}>📷 {entry.images.length}</span>}
            {!!entry.earned&&<span style={{fontSize:11,fontWeight:700,color:'var(--green)'}}>💰 ${Number(entry.earned).toFixed(0)}</span>}
          </div>
        </div>
        <span className={`caret${open?' open':''}`}>›</span>
      </div>

      {open&&(
        <div className="ec-body">
          {!!entry.earned&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(52,211,153,0.07)',border:'1px solid rgba(52,211,153,0.15)',borderRadius:10,padding:'10px 13px'}}>
              <span style={{fontSize:11,fontWeight:600,color:'var(--t3)'}}>Earned today</span>
              <span className="earn-chip">💰 ${Number(entry.earned).toFixed(2)}</span>
            </div>
          )}

          {entry.tasks&&(
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.10em',marginBottom:5}}>Summary</div>
              <p style={{fontSize:13,fontWeight:600,color:'var(--t1)',lineHeight:1.5}}>{entry.tasks}</p>
            </div>
          )}

          <NotesRenderer sections={entry.sections} notes={entry.notes} color={cat.color}/>

          {(before||after)&&(
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.10em',marginBottom:7}}>Before / After</div>
              <div className="ba-grid">
                {[{img:before,label:'Before'},{img:after,label:'After'}].map(({img,label},i)=>
                  img
                    ? <div key={i} className="ba-item" onClick={()=>setLb(img.url)}><img src={img.url} alt={label} loading="lazy"/><span className="ba-tag">{label}</span></div>
                    : <div key={i} className="ba-item"><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--t4)',fontSize:22}}>📷</div><span className="ba-tag">{label}</span></div>
                )}
              </div>
            </div>
          )}

          {other.length>0&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
              {other.map((img,i)=>(
                <div key={i} className="ba-item" onClick={()=>setLb(img.url)}>
                  <img src={img.url} alt={img.caption||'Photo'} loading="lazy"/>
                  {img.caption&&<span className="ba-tag">{img.caption}</span>}
                </div>
              ))}
            </div>
          )}

          <div>
            <button className="btn btn-ghost btn-sm" onClick={()=>makePDF([entry],categories,fmtDate(entry.date))}>📄 Export PDF</button>
          </div>
        </div>
      )}
      {lb&&<div className="lb" onClick={()=>setLb(null)}><button className="lb-x">✕</button><img src={lb} alt="full"/></div>}
    </div>
  );
}

export default function Journal() {
  const { entries, categories, projects, loading } = useLogs();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const sorted = [...entries].sort((a,b)=>b.date.localeCompare(a.date));
  const filtered = sorted.filter(e=>{
    const mc = cat==='all'||e.category===cat;
    const mq = !q||(e.tasks||'').toLowerCase().includes(q.toLowerCase())||(e.notes||'').toLowerCase().includes(q.toLowerCase());
    return mc&&mq;
  });
  const usedCats = [...new Set(entries.map(e=>e.category).filter(Boolean))];

  return (
    <Layout title="Journal">
      {!loading&&entries.length>0&&(
        <>
          <div className="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search entries…" value={q} onChange={e=>setQ(e.target.value)}/>
            {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:14,padding:0}}>✕</button>}
          </div>

          <div className="frow">
            <button className={`fchip${cat==='all'?' on':''}`} onClick={()=>setCat('all')}>All</button>
            {usedCats.map(id=>{ const c=getCatStyle(categories,id); return (
              <button key={id} className={`fchip${cat===id?' on':''}`} onClick={()=>setCat(id)}>{c.icon} {c.name}</button>
            );})}
          </div>

          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:13}}>
            <button className="btn btn-accent btn-sm" onClick={()=>makePDF(filtered,categories,'Work Log')}>
              📄 Export {filtered.length} {filtered.length===1?'entry':'entries'}
            </button>
          </div>
        </>
      )}

      {loading
        ? [0,1,2].map(i=><div key={i} className="sk" style={{height:80,marginBottom:9}}/>)
        : filtered.length===0
          ? <div className="empty"><div className="empty-ico">{entries.length===0?'📓':'🔎'}</div><div className="empty-h">{entries.length===0?'No entries yet':'No results'}</div><div className="empty-s">{entries.length===0?'Tell me your hours, tasks, and notes.':'Try a different search or filter.'}</div></div>
          : filtered.map(e=><EntryCard key={e.date} entry={e} categories={categories}/>)
      }
    </Layout>
  );
}

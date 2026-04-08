import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, fmtDate, getCatStyle, totalHours } from '../lib/data';

async function exportPDF(entries, categories, label) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  doc.setFillColor(10,10,11); doc.rect(0,0,210,297,'F');
  doc.setTextColor(249,115,22); doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text('WORK LOG', 14, 22);
  doc.setFontSize(10); doc.setTextColor(120,120,125); doc.setFont('helvetica','normal');
  doc.text(label, 14, 30);
  doc.text(`Exported ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`, 14, 36);
  const tot = totalHours(entries);
  doc.setTextColor(210,210,215);
  doc.text(`${tot.toFixed(1)} hours · ${entries.length} entries`, 14, 44);
  const rows = entries.map(e => {
    const cat = getCatStyle(categories, e.category);
    return [
      new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),
      `${cat.icon} ${cat.name}`,
      `${parseFloat(e.hours).toFixed(1)}h`,
      e.earned ? `$${Number(e.earned).toFixed(2)}` : '—',
      e.tasks || '',
    ];
  });
  autoTable(doc, {
    startY: 52,
    head: [['Date','Category','Hours','Earned','Tasks']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor:[20,20,22], textColor:[249,115,22], fontSize:9, fontStyle:'bold', cellPadding:4 },
    bodyStyles: { fillColor:[14,14,16], textColor:[195,195,200], fontSize:8.5, cellPadding:4 },
    alternateRowStyles: { fillColor:[18,18,20] },
    columnStyles: { 0:{cellWidth:28}, 1:{cellWidth:28}, 2:{cellWidth:14,halign:'center'}, 3:{cellWidth:18,halign:'center'}, 4:{cellWidth:'auto'} },
    margin: { left:14, right:14 },
  });
  doc.save(`worklog-${label.replace(/\s+/g,'-').toLowerCase()}.pdf`);
}

function EntryCard({ entry, categories }) {
  const [open, setOpen] = useState(false);
  const [lb, setLb] = useState(null);
  const cat = getCatStyle(categories, entry.category);
  const h = parseFloat(entry.hours) || 0;
  const hasImages = entry.images && entry.images.length > 0;
  const before = hasImages ? entry.images.find(i => i.type==='before') : null;
  const after  = hasImages ? entry.images.find(i => i.type==='after')  : null;
  const other  = hasImages ? entry.images.filter(i => i.type!=='before'&&i.type!=='after') : [];

  return (
    <div className="ecard fu">
      <div className="ecard-hdr" onClick={() => setOpen(o => !o)}>
        <div className="hrs-badge" style={{ background: cat.color }}>
          <span className="hv">{h%1===0?h:h.toFixed(1)}</span>
          <span className="hl">HRS</span>
        </div>
        <div className="ecard-info">
          <div className="ecard-date">{fmtDate(entry.date)}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
            <span className="chip" style={{ background:cat.color+'20', color:cat.color }}>{cat.icon} {cat.name}</span>
            {hasImages && <span style={{ fontSize:11, color:'var(--t4)' }}>📷 {entry.images.length}</span>}
            {entry.earned > 0 && <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>💰${Number(entry.earned).toFixed(0)}</span>}
          </div>
        </div>
        <span className={`chevron${open?' open':''}`}>›</span>
      </div>

      {open && (
        <div className="ecard-body">
          {entry.earned > 0 && (
            <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:10, padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--t3)' }}>Earned today</span>
              <span className="earned-pill">💰 ${Number(entry.earned).toFixed(2)}</span>
            </div>
          )}

          {entry.tasks && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:5 }}>Summary</div>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', lineHeight:1.5 }}>{entry.tasks}</p>
            </div>
          )}

          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={cat.color} />

          {(before || after) && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:8 }}>Before / After</div>
              <div className="ba-grid">
                {[before,after].map((img,idx) => img ? (
                  <div key={idx} className="ba-item" onClick={()=>setLb(img.url)}>
                    <img src={img.url} alt={img.type} loading="lazy" />
                    <span className="ba-tag">{idx===0?'Before':'After'}</span>
                  </div>
                ) : (
                  <div key={idx} className="ba-item">
                    <div className="ba-ph">📷</div>
                    <span className="ba-tag">{idx===0?'Before':'After'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {other.map((img,idx) => (
                <div key={idx} className="ba-item" onClick={()=>setLb(img.url)}>
                  <img src={img.url} alt={img.caption||'Image'} loading="lazy" />
                  {img.caption && <span className="ba-tag">{img.caption}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>exportPDF([entry],categories,fmtDate(entry.date))}>📄 Export PDF</button>
          </div>
        </div>
      )}

      {lb && (
        <div className="lb-over" onClick={()=>setLb(null)}>
          <button className="lb-close">✕</button>
          <img src={lb} className="lb-img" alt="Preview" />
        </div>
      )}
    </div>
  );
}

export default function Journal() {
  const { entries, categories, loading } = useLogs();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter(e => {
    const matchCat = catFilter==='all' || e.category===catFilter;
    const q = search.toLowerCase();
    const matchQ = !q || (e.tasks||'').toLowerCase().includes(q) || (e.notes||'').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  const usedCats = [...new Set(entries.map(e=>e.category).filter(Boolean))];

  return (
    <Layout title="Journal">
      {!loading && entries.length > 0 && (
        <>
          <div className="search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text" placeholder="Search entries…"
              value={search} onChange={e=>setSearch(e.target.value)}
            />
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:15,padding:0,lineHeight:1}}>✕</button>}
          </div>

          <div className="frow">
            <button className={`fchip${catFilter==='all'?' on':''}`} onClick={()=>setCatFilter('all')}>All</button>
            {usedCats.map(id => {
              const cat = getCatStyle(categories, id);
              return (
                <button key={id} className={`fchip${catFilter===id?' on':''}`} onClick={()=>setCatFilter(id)}
                  style={catFilter===id?{}:{borderLeftColor:cat.color,borderLeftWidth:3}}>
                  {cat.icon} {cat.name}
                </button>
              );
            })}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button className="btn btn-accent btn-sm" onClick={()=>exportPDF(filtered,categories,'Work Log')}>
              📄 Export {filtered.length} {filtered.length===1?'entry':'entries'}
            </button>
          </div>
        </>
      )}

      {loading ? (
        [1,2,3].map(i=><div key={i} className="skel" style={{height:80,marginBottom:10}}/>)
      ) : filtered.length===0 ? (
        <div className="empty">
          <div className="empty-ico">{entries.length===0?'📓':'🔎'}</div>
          <div className="empty-title">{entries.length===0?'No entries yet':'No results'}</div>
          <div className="empty-sub">{entries.length===0?'Tell me your hours, tasks, and notes — I\'ll save everything here.':'Try a different search or filter.'}</div>
        </div>
      ) : filtered.map(e=><EntryCard key={e.date} entry={e} categories={categories}/>)}
    </Layout>
  );
}

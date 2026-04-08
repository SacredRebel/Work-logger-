import { useState } from 'react';
import Layout from '../components/Layout';
import NotesRenderer from '../components/NotesRenderer';
import { useLogs, fmtDate, getCatStyle, totalHours } from '../lib/data';

async function exportPDF(entries, categories, label) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Dark header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(255, 107, 53);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('WORK LOG', 14, 24);
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(label, 14, 32);
  doc.text(`Exported ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 38);
  const totalH = totalHours(entries);
  doc.setTextColor(220, 220, 215);
  doc.setFontSize(11);
  doc.text(`${totalH.toFixed(1)} hours · ${entries.length} entries`, 14, 48);

  const rows = entries.map(e => {
    const cat = getCatStyle(categories, e.category);
    return [
      new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      `${cat.icon} ${cat.name}`,
      `${parseFloat(e.hours).toFixed(1)}h`,
      e.tasks || '',
      e.notes ? e.notes.slice(0, 120) + (e.notes.length > 120 ? '…' : '') : '',
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [['Date', 'Category', 'Hours', 'Tasks', 'Notes']],
    body: rows,
    theme: 'plain',
    headStyles: { fillColor: [26, 26, 26], textColor: [255, 107, 53], fontSize: 9, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fillColor: [16, 16, 16], textColor: [200, 200, 196], fontSize: 8.5, cellPadding: 4 },
    alternateRowStyles: { fillColor: [20, 20, 20] },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 40 }, 4: { cellWidth: 'auto' } },
    margin: { left: 14, right: 14 },
  });

  doc.save(`worklog-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function ImageViewer({ url, onClose }) {
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img src={url} className="lightbox-img" alt="Preview" onClick={e => e.stopPropagation()} />
    </div>
  );
}

function EntryCard({ entry, categories, onExport }) {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const cat = getCatStyle(categories, entry.category);
  const hours = parseFloat(entry.hours) || 0;
  const hasImages = entry.images && entry.images.length > 0;
  const beforeImg = hasImages ? entry.images.find(i => i.type === 'before') : null;
  const afterImg = hasImages ? entry.images.find(i => i.type === 'after') : null;

  return (
    <div className="entry-card fade-up">
      <div className="entry-header" onClick={() => setOpen(o => !o)}>
        <div className="hours-badge" style={{ background: cat.color }}>
          <span className="hb-val">{hours.toFixed(1)}</span>
          <span className="hb-lbl">hrs</span>
        </div>
        <div className="entry-info">
          <div className="entry-date">{fmtDate(entry.date)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: cat.color + '22', color: cat.color, padding: '2px 8px' }}>
              {cat.icon} {cat.name}
            </span>
            {hasImages && <span style={{ fontSize: 11, color: 'var(--text4)' }}>📷 {entry.images.length} photo{entry.images.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <span style={{ color: 'var(--text4)', fontSize: 20, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>›</span>
      </div>

      {open && (
        <div className="entry-body">
          {entry.tasks && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Tasks</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{entry.tasks}</p>
            </div>
          )}
          {entry.earned && (
            <div style={{background:'#30D15815',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,fontWeight:700,color:'var(--text3)'}}>Earned today</span>
              <span style={{fontSize:17,fontWeight:800,color:'#30D158'}}>💰 ${entry.earned.toFixed(2)}</span>
            </div>
          )}
          <NotesRenderer sections={entry.sections} notes={entry.notes} accentColor={cat.color} />

          {/* Before / After photos */}
          {(beforeImg || afterImg) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Before / After
              </div>
              <div className="ba-grid">
                {beforeImg ? (
                  <div className="ba-item" onClick={() => setLightbox(beforeImg.url)}>
                    <img src={beforeImg.url} alt="Before" loading="lazy" />
                    <span className="ba-badge">Before</span>
                  </div>
                ) : (
                  <div className="ba-item">
                    <div className="ba-placeholder">📷</div>
                    <span className="ba-badge">Before</span>
                  </div>
                )}
                {afterImg ? (
                  <div className="ba-item" onClick={() => setLightbox(afterImg.url)}>
                    <img src={afterImg.url} alt="After" loading="lazy" />
                    <span className="ba-badge">After</span>
                  </div>
                ) : (
                  <div className="ba-item">
                    <div className="ba-placeholder">📷</div>
                    <span className="ba-badge">After</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other images */}
          {hasImages && entry.images.filter(i => i.type !== 'before' && i.type !== 'after').length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {entry.images.filter(i => i.type !== 'before' && i.type !== 'after').map((img, idx) => (
                <div key={idx} className="ba-item" onClick={() => setLightbox(img.url)}>
                  <img src={img.url} alt={img.caption || 'Image'} loading="lazy" />
                  {img.caption && <span className="ba-badge">{img.caption}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onExport([entry], fmtDate(entry.date))}>
              📄 Export PDF
            </button>
          </div>
        </div>
      )}

      {lightbox && <ImageViewer url={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export default function Journal() {
  const { entries, categories, loading } = useLogs();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const filtered = sorted.filter(e => {
    const matchCat = catFilter === 'all' || e.category === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (e.tasks || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const usedCats = [...new Set(entries.map(e => e.category).filter(Boolean))];

  return (
    <Layout title="Journal">
      {!loading && entries.length > 0 && (
        <>
          {/* Search */}
          <div style={{
            background: 'var(--bg2)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            boxShadow: 'var(--shadow)',
          }}>
            <span style={{ fontSize: 16, color: 'var(--text3)' }}>🔍</span>
            <input
              type="text"
              placeholder="Search notes & tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                font: 'inherit',
                fontSize: 15,
                color: 'var(--text1)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            )}
          </div>

          {/* Category filter */}
          <div className="filter-row">
            <button className={`filter-chip ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>All</button>
            {usedCats.map(catId => {
              const cat = getCatStyle(categories, catId);
              return (
                <button key={catId} className={`filter-chip ${catFilter === catId ? 'active' : ''}`} onClick={() => setCatFilter(catId)}
                  style={catFilter === catId ? {} : { borderLeft: `3px solid ${cat.color}` }}>
                  {cat.icon} {cat.name}
                </button>
              );
            })}
          </div>

          {/* Export all */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-accent btn-sm" onClick={() => exportPDF(filtered, categories, 'Work Log')}>
              📄 Export {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </button>
          </div>
        </>
      )}

      {loading ? (
        <div>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 16, marginBottom: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{entries.length === 0 ? '📓' : '🔎'}</div>
          <div className="empty-title">{entries.length === 0 ? 'No journal entries yet' : 'No results'}</div>
          <div className="empty-sub">
            {entries.length === 0
              ? 'Tell me your hours, tasks, and notes — I\'ll save everything here with dates and photos.'
              : 'Try a different search or category filter.'}
          </div>
        </div>
      ) : (
        filtered.map(e => (
          <EntryCard
            key={e.date}
            entry={e}
            categories={categories}
            onExport={(entries, label) => exportPDF(entries, categories, label)}
          />
        ))
      )}
    </Layout>
  );
}

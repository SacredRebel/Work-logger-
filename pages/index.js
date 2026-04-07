import { useState, useEffect, useCallback } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseHours(h) { return parseFloat(h) || 0; }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  };
}

function groupByWeek(entries) {
  const weeks = {};
  entries.forEach(e => {
    const { start } = getWeekRange(e.date);
    if (!weeks[start]) weeks[start] = [];
    weeks[start].push(e);
  });
  return weeks;
}

function totalHours(entries) {
  return entries.reduce((s, e) => s + parseHours(e.hours), 0);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── PDF Export ─────────────────────────────────────────────────────────────

async function exportPDF(entries, label) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(245, 166, 35);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('WORK LOG', 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(136, 136, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(label, 14, 30);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 36);

  const total = totalHours(entries);
  doc.setTextColor(232, 232, 224);
  doc.setFontSize(11);
  doc.text(`Total: ${total.toFixed(1)} hours across ${entries.length} day${entries.length !== 1 ? 's' : ''}`, 14, 46);

  // Table
  autoTable(doc, {
    startY: 54,
    head: [['Date', 'Hours', 'Tasks / Notes']],
    body: entries.map(e => [fmtShort(e.date), `${parseHours(e.hours).toFixed(1)}h`, e.notes || e.tasks || '']),
    theme: 'plain',
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [245, 166, 35],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fillColor: [16, 16, 16],
      textColor: [200, 200, 196],
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: [20, 20, 20] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`worklog-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// ─── Components ─────────────────────────────────────────────────────────────

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 800, color: accent ? 'var(--amber)' : 'var(--text)', lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function EntryCard({ entry, onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40, height: 40,
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber-dim)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--amber)',
            flexShrink: 0,
          }}>
            {parseHours(entry.hours).toFixed(1)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{fmtDate(entry.date)}</div>
            {entry.tasks && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {entry.tasks.length > 60 ? entry.tasks.slice(0, 60) + '…' : entry.tasks}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={e => { e.stopPropagation(); onExport([entry], fmtShort(entry.date)); }}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)', borderRadius: 6, padding: '6px 12px',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            PDF
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>›</span>
        </div>
      </div>
      {open && entry.notes && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 20px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: 'var(--text-dim)',
          lineHeight: 1.7,
          background: 'var(--bg3)',
        }}>
          {entry.notes}
        </div>
      )}
    </div>
  );
}

function WeekBlock({ weekStart, entries, onExport }) {
  const weekEnd = new Date(weekStart + 'T12:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);
  const label = `${fmtShort(weekStart)} – ${fmtShort(weekEnd.toISOString().split('T')[0])}`;
  const total = totalHours(entries);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Week</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)' }}>{total.toFixed(1)}h</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{entries.length} day{entries.length !== 1 ? 's' : ''}</div>
          </div>
          <button
            onClick={() => onExport(entries, label)}
            style={{
              background: 'var(--amber)', border: 'none',
              color: '#0a0a0a', borderRadius: 7, padding: '8px 16px',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, letterSpacing: '0.05em',
            }}
          >
            Export PDF
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(e => <EntryCard key={e.date} entry={e} onExport={onExport} />)}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('week');
  const [lastFetch, setLastFetch] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch('/api/logs?t=' + Date.now());
      if (!r.ok) throw new Error('Could not load logs');
      const data = await r.json();
      setEntries(data.entries || []);
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 30000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // Derived data
  const today = todayStr();
  const thisWeek = getWeekRange(today);
  const todayEntries = entries.filter(e => e.date === today);
  const weekEntries = entries.filter(e => e.date >= thisWeek.start && e.date <= thisWeek.end);
  const allSorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const weeks = groupByWeek(allSorted);
  const weekKeys = Object.keys(weeks).sort((a, b) => b.localeCompare(a));

  const weekTotal = totalHours(weekEntries);
  const allTotal = totalHours(entries);
  const todayTotal = totalHours(todayEntries);

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'all', label: 'All Entries' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32,
                background: 'var(--amber)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a" strokeWidth="2.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>WORK LOG</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>sacredrebel</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {lastFetch && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  synced {lastFetch.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={fetchLogs}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', borderRadius: 6, padding: '6px 12px',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          <Stat label="Today" value={`${todayTotal.toFixed(1)}h`} accent={todayTotal > 0} />
          <Stat label="This Week" value={`${weekTotal.toFixed(1)}h`} accent />
          <Stat label="All Time" value={`${allTotal.toFixed(1)}h`} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32, background: 'var(--bg2)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'var(--amber)' : 'transparent',
                color: tab === t.id ? '#0a0a0a' : 'var(--text-dim)',
                border: 'none',
                borderRadius: 7,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: '0.02em',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            loading logs…
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, padding: 20, color: 'var(--red)', fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {error}
          </div>
        )}

        {!loading && !error && tab === 'today' && (
          <div>
            {todayEntries.length === 0 ? (
              <EmptyState msg="No entries for today yet." sub="Tell Claude your hours and tasks to log them." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayEntries.map(e => <EntryCard key={e.date} entry={e} onExport={(entries, label) => exportPDF(entries, label)} />)}
              </div>
            )}
          </div>
        )}

        {!loading && !error && tab === 'week' && (
          <div>
            {weekEntries.length === 0 ? (
              <EmptyState msg="No entries this week yet." sub="Tell Claude your hours and tasks to get started." />
            ) : (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 24, padding: '16px 20px',
                  background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
                  borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Weekly Total</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                      {fmtShort(thisWeek.start)} — {fmtShort(thisWeek.end)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--amber)' }}>{weekTotal.toFixed(1)}h</div>
                    <button
                      onClick={() => exportPDF(weekEntries, `Week of ${fmtShort(thisWeek.start)}`)}
                      style={{
                        background: 'var(--amber)', border: 'none',
                        color: '#0a0a0a', borderRadius: 7, padding: '10px 18px',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        fontWeight: 700, letterSpacing: '0.05em',
                      }}
                    >
                      Export Week PDF
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...weekEntries].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                    <EntryCard key={e.date} entry={e} onExport={(entries, label) => exportPDF(entries, label)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && tab === 'all' && (
          <div>
            {entries.length === 0 ? (
              <EmptyState msg="No entries yet." sub="Start by telling Claude your hours for today." />
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <button
                    onClick={() => exportPDF(allSorted, 'All Time')}
                    style={{
                      background: 'var(--amber)', border: 'none',
                      color: '#0a0a0a', borderRadius: 7, padding: '10px 18px',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 700, letterSpacing: '0.05em',
                    }}
                  >
                    Export All PDF
                  </button>
                </div>
                {weekKeys.map(wk => (
                  <WeekBlock
                    key={wk}
                    weekStart={wk}
                    entries={weeks[wk]}
                    onExport={(entries, label) => exportPDF(entries, label)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ msg, sub }) {
  return (
    <div style={{
      textAlign: 'center', padding: '80px 24px',
      border: '1px dashed var(--border)', borderRadius: 12,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>{msg}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>
    </div>
  );
}

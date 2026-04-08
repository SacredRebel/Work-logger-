import Head from 'next/head'
import { useState, useEffect, useMemo, useCallback } from 'react'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'development', label: 'Dev', color: '#4f9cf9' },
  { id: 'design',      label: 'Design', color: '#bf5af2' },
  { id: 'meetings',    label: 'Meetings', color: '#ffd60a' },
  { id: 'admin',       label: 'Admin', color: '#30d158' },
  { id: 'research',    label: 'Research', color: '#ff375f' },
  { id: 'client',      label: 'Client', color: '#ff9f0a' },
  { id: 'learning',    label: 'Learning', color: '#64d2ff' },
  { id: 'other',       label: 'Other', color: '#8e8e93' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
const getCat = id => CAT_MAP[id] || CATEGORIES[CATEGORIES.length - 1]

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(ds) {
  const d = new Date(ds + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtShort(ds) {
  const d = new Date(ds + 'T12:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
  const dDate = new Date(ds + 'T00:00:00')
  if (dDate.getTime() === today.getTime()) return 'Today'
  if (dDate.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtHours(h) {
  if (!h) return '0h'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (!mins) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function getWeekDates() {
  const dates = []
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function getStreak(entries) {
  if (!entries.length) return 0
  const logged = new Set(entries.map(e => e.date))
  let streak = 0
  const d = new Date()
  d.setHours(0,0,0,0)
  // Allow today or yesterday as starting point
  if (!logged.has(d.toISOString().split('T')[0])) {
    d.setDate(d.getDate()-1)
  }
  while (logged.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate()-1)
  }
  return streak
}

function groupByDate(entries) {
  const groups = {}
  for (const e of entries) {
    if (!groups[e.date]) groups[e.date] = []
    groups[e.date].push(e)
  }
  return Object.entries(groups).sort(([a],[b]) => b.localeCompare(a))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Book: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Chevron: ({ down }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: down ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  ),
  Flame: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c0 0-3.5 3-3.5 7.5 0 1.5.5 3 1.5 4-.5-1-.5-2.5.5-3.5C11.5 13 12 17 12 17s.5-4 1.5-7c1.5 2 2.5 4.5 2.5 7 0 2.2-1.8 4-4 4s-4-1.8-4-4C8 11 12 2 12 2z"/>
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'today',   label: 'Today',   icon: Icon.Home },
    { id: 'history', label: 'History', icon: Icon.Clock },
    { id: 'stats',   label: 'Stats',   icon: Icon.BarChart },
    { id: 'journal', label: 'Journal', icon: Icon.Book },
  ]
  return (
    <nav className="bottom-nav">
      {items.map(({ id, label, icon: Ic }) => (
        <button key={id} className={`nav-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
          <Ic />
          {label}
        </button>
      ))}
    </nav>
  )
}

// ─────────────────────────────────────────────
// ENTRY CARD
// ─────────────────────────────────────────────
function EntryCard({ entry, onDelete }) {
  const [open, setOpen] = useState(false)
  const cat = getCat(entry.category)
  const hasPhotos = entry.beforePhoto || entry.afterPhoto
  const hasNotes = entry.notes && entry.notes.trim()

  return (
    <div className="entry-card">
      <div className="entry-card-inner" onClick={() => setOpen(o => !o)}>
        <div className="entry-bar" style={{ background: cat.color }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-8" style={{ marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.label}</span>
            {(hasNotes || hasPhotos) && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                {hasPhotos ? '📷 ' : ''}{hasNotes ? '📝' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2 }} className="truncate-2">
            {entry.tasks}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            {fmtHours(entry.hours)}
          </div>
          {entry.startHour && entry.endHour && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
              {Math.floor(entry.startHour)}:{String(Math.round((entry.startHour % 1)*60)).padStart(2,'0')}–{Math.floor(entry.endHour)}:{String(Math.round((entry.endHour%1)*60)).padStart(2,'0')}
            </div>
          )}
        </div>
        <div style={{ width: 16, flexShrink: 0, color: 'var(--text-3)' }}>
          <Icon.Chevron down={open} />
        </div>
      </div>

      {open && (
        <div className="entry-expand">
          {hasNotes && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: hasPhotos ? 12 : 0 }}>
              {entry.notes}
            </p>
          )}
          {hasPhotos && (
            <div className="photo-grid">
              {entry.beforePhoto && (
                <div className="photo-block">
                  <img src={entry.beforePhoto} alt="Before" />
                  <div className="photo-label">Before</div>
                </div>
              )}
              {entry.afterPhoto && (
                <div className="photo-block">
                  <img src={entry.afterPhoto} alt="After" />
                  <div className="photo-label">After</div>
                </div>
              )}
            </div>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', background: 'none', border: 'none', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              <span style={{ width: 14, height: 14, display: 'inline-block' }}><Icon.Trash /></span>
              Delete entry
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// DAY TIMELINE
// ─────────────────────────────────────────────
function DayTimeline({ entries }) {
  const hours = [6, 9, 12, 15, 18, 21]
  const START = 6, END = 22, RANGE = END - START

  const blocks = entries.filter(e => e.startHour != null && e.endHour != null)

  return (
    <div className="timeline-wrap">
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Day Timeline</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{blocks.length} sessions</span>
      </div>
      <div className="timeline-track">
        {blocks.map((e, i) => {
          const cat = getCat(e.category)
          const left = Math.max(0, ((e.startHour - START) / RANGE)) * 100
          const width = Math.min(100 - left, ((e.endHour - e.startHour) / RANGE) * 100)
          return (
            <div
              key={i}
              className="timeline-block"
              style={{ left: `${left}%`, width: `${width}%`, background: cat.color, opacity: 0.85 }}
              title={`${cat.label}: ${fmtHours(e.hours)}`}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {cat.label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="timeline-labels">
        {hours.map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{h}:00</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// WEEKLY BAR CHART
// ─────────────────────────────────────────────
function WeeklyChart({ entries }) {
  const weekDates = getWeekDates()
  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const hoursPerDay = weekDates.map(d => {
    return entries.filter(e => e.date === d).reduce((s, e) => s + (e.hours || 0), 0)
  })
  const max = Math.max(...hoursPerDay, 1)
  const today = todayStr()

  return (
    <div>
      <div className="bar-chart">
        {hoursPerDay.map((h, i) => {
          const isToday = weekDates[i] === today
          const pct = (h / max) * 100
          return (
            <div key={i} className="bar-col">
              {h > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 'auto' }}>
                  {h % 1 === 0 ? h : h.toFixed(1)}
                </span>
              )}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div
                  className="bar-fill"
                  style={{
                    height: `${Math.max(pct, h > 0 ? 5 : 0)}%`,
                    background: isToday ? 'var(--accent)' : h > 0 ? 'var(--surface-3)' : 'var(--surface-2)',
                    border: isToday ? 'none' : h > 0 ? '1px solid var(--border-2)' : 'none',
                    minHeight: h > 0 ? 4 : 0,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {DAY_LABELS.map((l, i) => {
          const isToday = weekDates[i] === today
          return (
            <div key={i} className="bar-col">
              <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 600, color: isToday ? 'var(--accent)' : 'var(--text-3)' }}>
                {l}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CATEGORY BREAKDOWN
// ─────────────────────────────────────────────
function CategoryBreakdown({ entries }) {
  const totals = useMemo(() => {
    const map = {}
    for (const e of entries) {
      map[e.category] = (map[e.category] || 0) + (e.hours || 0)
    }
    return Object.entries(map).sort(([,a],[,b]) => b - a).slice(0, 6)
  }, [entries])

  const grand = totals.reduce((s, [,h]) => s + h, 0) || 1

  return (
    <div className="cat-list">
      {totals.map(([id, h]) => {
        const cat = getCat(id)
        const pct = (h / grand) * 100
        return (
          <div key={id} className="cat-row">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', width: 60, flexShrink: 0 }}>{cat.label}</span>
            <div className="cat-bar-bg">
              <div className="cat-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
              {fmtHours(h)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// HEATMAP
// ─────────────────────────────────────────────
function Heatmap({ entries }) {
  const WEEKS = 16
  const DAYS = WEEKS * 7
  const cells = useMemo(() => {
    const hoursMap = {}
    for (const e of entries) {
      hoursMap[e.date] = (hoursMap[e.date] || 0) + (e.hours || 0)
    }
    const arr = []
    const today = new Date()
    // Start from DAYS-1 days ago
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - DAYS + 1)
    // Align to Monday
    const dayOfWeek = startDate.getDay()
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - offset)
    
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const h = hoursMap[ds] || 0
      const isFuture = d > today
      arr.push({ date: ds, hours: h, isFuture })
    }
    return arr
  }, [entries])

  function getHeatColor(hours, isFuture) {
    if (isFuture) return 'var(--surface-2)'
    if (hours === 0) return 'var(--surface-3)'
    if (hours < 3) return 'rgba(255,107,53,0.25)'
    if (hours < 5) return 'rgba(255,107,53,0.5)'
    if (hours < 7) return 'rgba(255,107,53,0.75)'
    return 'rgba(255,107,53,1)'
  }

  return (
    <div>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            className="heat-cell"
            style={{ background: getHeatColor(cell.hours, cell.isFuture) }}
            title={cell.hours ? `${cell.date}: ${fmtHours(cell.hours)}` : cell.date}
          />
        ))}
      </div>
      <div className="flex items-center gap-8" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Less</span>
        {[0,0.25,0.5,0.75,1].map((o, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: o === 0 ? 'var(--surface-3)' : `rgba(255,107,53,${o})` }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>More</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ADD ENTRY MODAL
// ─────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    date: todayStr(),
    hours: '',
    category: 'development',
    tasks: '',
    notes: '',
    startHour: '',
    endHour: '',
    beforePhoto: '',
    afterPhoto: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.hours || !form.tasks) { setError('Hours and tasks are required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hours: parseFloat(form.hours),
          startHour: form.startHour ? parseFloat(form.startHour) : null,
          endHour: form.endHour ? parseFloat(form.endHour) : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        onAdd(data.entry)
        setTimeout(onClose, 1500)
      } else {
        setError(data.error || 'Failed to save. Check GITHUB_TOKEN env var.')
      }
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h2 className="t-heading">Log Work</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, background: 'var(--surface-3)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer' }}>
            <Icon.X />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center" style={{ padding: '32px 0', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Icon.Check />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>Logged! Deploying in ~30s</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            <div className="flex gap-12">
              <div style={{ flex: 1 }}>
                <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>Date</label>
                <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>Hours</label>
                <input type="number" className="input" placeholder="7.5" step="0.25" min="0" max="24" value={form.hours} onChange={e => set('hours', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="t-label text-2" style={{ display: 'block', marginBottom: 8 }}>Category</label>
              <div className="cat-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className={`cat-pill${form.category === cat.id ? ' selected' : ''}`}
                    style={{ '--cat-color': cat.color }}
                    onClick={() => set('category', cat.id)}
                  >
                    <div className="cat-dot" style={{ background: cat.color }} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>What did you work on?</label>
              <input className="input" placeholder="Brief summary of tasks…" value={form.tasks} onChange={e => set('tasks', e.target.value)} />
            </div>

            <div>
              <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <textarea className="input" placeholder="Wins, blockers, thoughts…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div className="flex gap-12">
              <div style={{ flex: 1 }}>
                <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>Start hour (e.g. 9)</label>
                <input type="number" className="input" placeholder="9" step="0.5" min="0" max="24" value={form.startHour} onChange={e => set('startHour', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>End hour (e.g. 17)</label>
                <input type="number" className="input" placeholder="17" step="0.5" min="0" max="24" value={form.endHour} onChange={e => set('endHour', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>Before photo URL</label>
              <input className="input" placeholder="https://…" value={form.beforePhoto} onChange={e => set('beforePhoto', e.target.value)} />
            </div>
            <div>
              <label className="t-label text-2" style={{ display: 'block', marginBottom: 6 }}>After photo URL</label>
              <input className="input" placeholder="https://…" value={form.afterPhoto} onChange={e => set('afterPhoto', e.target.value)} />
            </div>

            {error && <p style={{ fontSize: 13, color: '#ff375f', background: 'rgba(255,55,95,0.1)', padding: '10px 14px', borderRadius: 10 }}>{error}</p>}

            <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TODAY TAB
// ─────────────────────────────────────────────
function TodayTab({ entries, streak }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  
  const todayEntries = entries.filter(e => e.date === todayStr())
  const todayHours = todayEntries.reduce((s, e) => s + (e.hours || 0), 0)
  
  const weekDates = getWeekDates()
  const weekHours = entries.filter(e => weekDates.includes(e.date)).reduce((s, e) => s + (e.hours || 0), 0)
  const monthStr = todayStr().slice(0, 7)
  const monthHours = entries.filter(e => e.date.startsWith(monthStr)).reduce((s, e) => s + (e.hours || 0), 0)

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="p-20 flex flex-col gap-16">
      {/* Hero */}
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginBottom: 4 }}>{dateLabel}</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{greeting} 👋</h1>
      </div>

      {/* Big today number */}
      <div className="card" style={{ background: 'var(--surface)', padding: '20px 20px' }}>
        <p className="t-caption text-3" style={{ marginBottom: 8 }}>Today's hours</p>
        <div className="flex items-center justify-between">
          <span className="t-num" style={{ color: todayHours > 0 ? 'var(--text)' : 'var(--text-3)' }}>
            {todayHours > 0 ? fmtHours(todayHours) : '—'}
          </span>
          {streak > 0 && (
            <div className="streak-badge">
              <Icon.Flame />
              {streak} day streak
            </div>
          )}
        </div>
        <div className="flex gap-16" style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>THIS WEEK</p>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtHours(weekHours)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>THIS MONTH</p>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtHours(monthHours)}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {todayEntries.length > 0 && <DayTimeline entries={todayEntries} />}

      {/* Today entries */}
      {todayEntries.length > 0 ? (
        <div>
          <p className="section-label">Today's sessions</p>
          <div className="flex flex-col gap-8">
            {todayEntries.map(e => <EntryCard key={e.id} entry={e} />)}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty" style={{ padding: '24px 0' }}>
            <p style={{ fontSize: 32 }}>🎯</p>
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>No sessions logged today</p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', textAlign: 'center' }}>
              Tap the + button to log your first session
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────────
function HistoryTab({ entries, onDelete }) {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter)
  const grouped = groupByDate(filtered)
  const totalHours = filtered.reduce((s, e) => s + (e.hours || 0), 0)

  return (
    <div className="p-20 flex flex-col gap-8">
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <h2 className="t-heading">History</h2>
        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
          {filtered.length} entries · {fmtHours(totalHours)}
        </span>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 8, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
        <button
          onClick={() => setFilter('all')}
          style={{ padding: '6px 14px', borderRadius: 100, border: filter === 'all' ? '1.5px solid var(--accent)' : '1.5px solid var(--border-2)', background: filter === 'all' ? 'var(--accent-2)' : 'var(--surface-2)', color: filter === 'all' ? 'var(--accent)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font)' }}
        >All</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            style={{ padding: '6px 14px', borderRadius: 100, border: filter === cat.id ? `1.5px solid ${cat.color}` : '1.5px solid var(--border-2)', background: filter === cat.id ? `${cat.color}20` : 'var(--surface-2)', color: filter === cat.id ? cat.color : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font)' }}
          >{cat.label}</button>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="empty">
          <p style={{ fontSize: 32 }}>📋</p>
          <p style={{ fontWeight: 600 }}>No entries found</p>
        </div>
      )}

      {grouped.map(([date, dayEntries]) => {
        const dayHours = dayEntries.reduce((s, e) => s + (e.hours || 0), 0)
        return (
          <div key={date}>
            <div className="flex items-center justify-between" style={{ padding: '12px 0 6px' }}>
              <span className="date-header" style={{ padding: 0 }}>{fmtShort(date)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{fmtHours(dayHours)}</span>
            </div>
            <div className="flex flex-col gap-8">
              {dayEntries.map(e => <EntryCard key={e.id} entry={e} onDelete={onDelete} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────
function StatsTab({ entries }) {
  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0)
  const totalDays = new Set(entries.map(e => e.date)).size
  const avgPerDay = totalDays ? (totalHours / totalDays) : 0
  const bestDay = useMemo(() => {
    const map = {}
    for (const e of entries) map[e.date] = (map[e.date] || 0) + (e.hours || 0)
    const best = Object.entries(map).sort(([,a],[,b]) => b - a)[0]
    return best ? { date: best[0], hours: best[1] } : null
  }, [entries])

  const weekDates = getWeekDates()
  const weekHours = entries.filter(e => weekDates.includes(e.date)).reduce((s, e) => s + (e.hours || 0), 0)
  const monthStr = todayStr().slice(0, 7)
  const monthHours = entries.filter(e => e.date.startsWith(monthStr)).reduce((s, e) => s + (e.hours || 0), 0)

  return (
    <div className="p-20 flex flex-col gap-16">
      <h2 className="t-heading">Stats</h2>

      {/* Summary cards */}
      <div className="stats-grid">
        {[
          { label: 'All-Time Hours', value: fmtHours(totalHours), accent: false },
          { label: 'Days Logged', value: totalDays, accent: false },
          { label: 'This Week', value: fmtHours(weekHours), accent: true },
          { label: 'This Month', value: fmtHours(monthHours), accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} className="stat-card">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {bestDay && (
        <div className="card" style={{ borderColor: 'rgba(255,215,10,0.2)', background: 'rgba(255,215,10,0.04)' }}>
          <div className="flex items-center gap-12">
            <span style={{ fontSize: 28 }}>🏆</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Best Day</p>
              <p style={{ fontSize: 20, fontWeight: 800 }}>{fmtHours(bestDay.hours)}</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{fmtDate(bestDay.date)}</p>
            </div>
          </div>
        </div>
      )}

      {avgPerDay > 0 && (
        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Daily Average</p>
          <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px' }}>{fmtHours(avgPerDay)}</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>across {totalDays} logged days</p>
        </div>
      )}

      {/* Weekly chart */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 16 }}>This Week</p>
        <WeeklyChart entries={entries} />
      </div>

      {/* Category breakdown */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 16 }}>By Category</p>
        <CategoryBreakdown entries={entries} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// JOURNAL TAB
// ─────────────────────────────────────────────
function JournalTab({ entries, streak }) {
  const withNotes = entries.filter(e => (e.notes && e.notes.trim()) || e.beforePhoto || e.afterPhoto)
  const grouped = groupByDate(withNotes)

  return (
    <div className="p-20 flex flex-col gap-16">
      <div className="flex items-center justify-between">
        <h2 className="t-heading">Journal</h2>
        {streak > 0 && (
          <div className="streak-badge">
            <Icon.Flame />
            {streak} days
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Logging streak — last 16 weeks</p>
        <Heatmap entries={entries} />
      </div>

      {/* Journal entries */}
      <div>
        <p className="section-label">Work journal</p>
        {grouped.length === 0 ? (
          <div className="card">
            <div className="empty" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: 32 }}>📓</p>
              <p style={{ fontWeight: 600 }}>No journal entries yet</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', textAlign: 'center' }}>
                Add notes or photos when logging work to see them here
              </p>
            </div>
          </div>
        ) : grouped.map(([date, dayEntries]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <p className="date-header">{fmtDate(date)}</p>
            <div className="flex flex-col gap-8">
              {dayEntries.map(e => {
                const cat = getCat(e.category)
                const hasPhotos = e.beforePhoto || e.afterPhoto
                return (
                  <div key={e.id} className="card" style={{ borderLeft: `3px solid ${cat.color}` }}>
                    <div className="flex items-center gap-8" style={{ marginBottom: e.notes || hasPhotos ? 10 : 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>·</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{fmtHours(e.hours)}</span>
                      <span style={{ flex: 1 }} />
                      {hasPhotos && <Icon.Camera />}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginBottom: e.notes ? 8 : 0 }}>{e.tasks}</p>
                    {e.notes && (
                      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: hasPhotos ? 12 : 0 }}>
                        {e.notes}
                      </p>
                    )}
                    {hasPhotos && (
                      <div className="photo-grid">
                        {e.beforePhoto && (
                          <div className="photo-block">
                            <img src={e.beforePhoto} alt="Before" onError={ev => ev.target.style.display='none'} />
                            <div className="photo-label">Before</div>
                          </div>
                        )}
                        {e.afterPhoto && (
                          <div className="photo-block">
                            <img src={e.afterPhoto} alt="After" onError={ev => ev.target.style.display='none'} />
                            <div className="photo-label">After</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function WorkLogger() {
  const [theme, setTheme] = useState('dark')
  const [tab, setTab] = useState('today')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(d => {
        setEntries((d.entries || []).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const streak = useMemo(() => getStreak(entries), [entries])

  const handleAdd = useCallback((entry) => {
    setEntries(prev => [entry, ...prev].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)))
  }, [])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this entry?')) return
    const token = process.env.NEXT_PUBLIC_HAS_TOKEN
    try {
      await fetch(`/api/logs?id=${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }, [])

  const tabLabel = { today: 'Today', history: 'History', stats: 'Stats', journal: 'Journal' }[tab]

  return (
    <>
      <Head>
        <title>Work Log</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0c0c0f" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Header */}
        <header className="header">
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Work<span style={{ color: 'var(--accent)' }}>Log</span>
          </span>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer' }}
          >
            {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
          </button>
        </header>

        {/* Page content */}
        <main className="scroll-area">
          {loading ? (
            <div className="p-20 flex flex-col gap-12">
              {[1,2,3].map(i => (
                <div key={i} className="loading-shimmer" style={{ height: i === 1 ? 140 : 80 }} />
              ))}
            </div>
          ) : (
            <>
              {tab === 'today' && <TodayTab entries={entries} streak={streak} />}
              {tab === 'history' && <HistoryTab entries={entries} onDelete={handleDelete} />}
              {tab === 'stats' && <StatsTab entries={entries} />}
              {tab === 'journal' && <JournalTab entries={entries} streak={streak} />}
            </>
          )}
        </main>

        {/* FAB */}
        <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add entry">
          <Icon.Plus />
        </button>

        {/* Bottom nav */}
        <BottomNav tab={tab} setTab={setTab} />

        {/* Modal */}
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      </div>

      <style jsx global>{`
        .truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}

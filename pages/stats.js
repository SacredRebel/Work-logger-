import { useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useLogs, todayStr, fmtShort, totalHours, getCatStyle, getWeekRange } from '../lib/data';

const Charts = dynamic(() => import('../components/Charts'), { ssr: false });

function getLast7Days() {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });
}

function getLast30Days() {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 29 + i);
    return d.toISOString().split('T')[0];
  });
}

export default function Stats() {
  const { entries, categories, loading } = useLogs();
  const [period, setPeriod] = useState('week');

  const today = todayStr();
  const days = period === 'week' ? getLast7Days() : getLast30Days();

  // Build bar chart data
  const barData = days.map(date => {
    const entry = entries.find(e => e.date === date);
    const h = entry ? parseFloat(entry.hours) || 0 : 0;
    const d = new Date(date + 'T12:00:00');
    const label = period === 'week'
      ? d.toLocaleDateString('en-US', { weekday: 'short' })
      : d.getDate() % 5 === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return { label, hours: parseFloat(h.toFixed(1)), date };
  });

  const periodEntries = entries.filter(e => days.includes(e.date));
  const periodTotal = totalHours(periodEntries);
  const periodDays = periodEntries.length;
  const avgHours = periodDays > 0 ? periodTotal / periodDays : 0;
  const bestEntry = [...periodEntries].sort((a, b) => (parseFloat(b.hours) || 0) - (parseFloat(a.hours) || 0))[0];
  const bestHours = bestEntry ? parseFloat(bestEntry.hours) || 0 : 0;

  // Category pie data
  const catMap = {};
  periodEntries.forEach(e => {
    const id = e.category || 'general';
    catMap[id] = (catMap[id] || 0) + (parseFloat(e.hours) || 0);
  });
  const pieData = Object.entries(catMap).map(([id, hours]) => {
    const cat = getCatStyle(categories, id);
    return { name: cat.name, hours: parseFloat(hours.toFixed(1)), color: cat.color, icon: cat.icon };
  }).sort((a, b) => b.hours - a.hours);

  // All-time stats
  const allTotal = totalHours(entries);
  const allDays = entries.length;
  const allAvg = allDays > 0 ? allTotal / allDays : 0;

  return (
    <Layout title="Analytics">
      {loading ? (
        <div>
          <div className="skeleton" style={{ height: 44, width: 200, borderRadius: 12, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: 16, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        </div>
      ) : (
        <>
          {/* Period toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="period-toggle">
              <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>7 Days</button>
              <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>30 Days</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{periodTotal.toFixed(1)}h</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>total hours</div>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div className="stat-tile">
              <span className="stat-val" style={{ fontSize: 20 }}>{avgHours.toFixed(1)}h</span>
              <span className="stat-lbl">Avg/day</span>
            </div>
            <div className="stat-tile">
              <span className="stat-val" style={{ fontSize: 20 }}>{bestHours.toFixed(1)}h</span>
              <span className="stat-lbl">Best day</span>
            </div>
            <div className="stat-tile">
              <span className="stat-val" style={{ fontSize: 20 }}>{periodDays}</span>
              <span className="stat-lbl">Days logged</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card card-p" style={{ marginBottom: 20 }}>
            <div className="sec-label">Hours per day</div>
            <Charts.WeekBarChart data={barData} />
          </div>

          {/* Category breakdown */}
          {pieData.length > 0 && (
            <div className="card card-p" style={{ marginBottom: 20 }}>
              <div className="sec-label">By Category</div>
              <Charts.CategoryPieChart data={pieData} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {pieData.map(cat => {
                  const pct = periodTotal > 0 ? (cat.hours / periodTotal) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.icon} {cat.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.hours}h · {pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All time */}
          <div className="card card-p" style={{ marginBottom: 20 }}>
            <div className="sec-label">All Time</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--accent)' }}>{allTotal.toFixed(0)}h</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Total hours</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' }}>{allDays}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Days logged</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' }}>{allAvg.toFixed(1)}h</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Avg/day</div>
              </div>
            </div>
          </div>

          {entries.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No data yet</div>
              <div className="empty-sub">Log some hours and your stats will show up here.</div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

import { useState } from 'react';
import { fmtDate, fmtShort } from '../lib/data';

export default function BillingTab({ project, entries, onMarkPaid }) {
  const [showPayForm, setShowPayForm] = useState(false);
  const [payNote, setPayNote] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [paying, setPaying] = useState(false);

  const color = project.color;
  const payments = project.payments || [];
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalEarned = entries.reduce((s, e) => s + (Number(e.earned) || 0), 0);
  const outstanding = Math.max(0, totalEarned - totalPaid);
  const overpaid = totalPaid > totalEarned ? totalPaid - totalEarned : 0;

  // Figure out which days are "covered" by payments
  // Apply payments chronologically against days in order
  let remaining = totalPaid;
  const dayStatus = entries
    .filter(e => e.earned > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const earned = Number(e.earned) || 0;
      if (remaining >= earned) {
        remaining -= earned;
        return { ...e, status: 'paid', coveredAmount: earned, partialRemaining: 0 };
      } else if (remaining > 0) {
        const partial = remaining;
        remaining = 0;
        return { ...e, status: 'partial', coveredAmount: partial, partialRemaining: earned - partial };
      } else {
        return { ...e, status: 'unpaid', coveredAmount: 0, partialRemaining: earned };
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // show newest first

  const unpaidDays = dayStatus.filter(d => d.status !== 'paid');
  const unpaidTotal = unpaidDays.reduce((s, d) => s + d.partialRemaining, 0);

  async function recordPayment(amount) {
    if (!amount || amount <= 0) return;
    setPaying(true);
    try {
      await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-payment',
          payload: {
            projectId: project.id,
            payment: {
              id: `pay-${Date.now()}`,
              amount: parseFloat(amount),
              date: new Date().toISOString().split('T')[0],
              note: payNote || 'Payment received',
              method: payMethod,
            }
          }
        })
      });
      setShowPayForm(false);
      setPayNote('');
      if (onMarkPaid) onMarkPaid();
    } catch(e) {
      alert('Could not save payment');
    } finally { setPaying(false); }
  }

  return (
    <div>
      {/* Outstanding balance — hero card */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 16,
        background: outstanding > 0
          ? `linear-gradient(135deg, #1a1200, #0d0a00)`
          : `linear-gradient(135deg, #001a0a, #000d05)`,
        border: `1px solid ${outstanding > 0 ? 'rgba(251,191,36,0.25)' : 'rgba(34,197,94,0.25)'}`,
        boxShadow: outstanding > 0
          ? '0 4px 24px rgba(251,191,36,0.10)'
          : '0 4px 24px rgba(34,197,94,0.10)',
      }}>
        <div style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em',
            color: outstanding > 0 ? 'rgba(251,191,36,0.6)' : 'rgba(34,197,94,0.6)', marginBottom: 4 }}>
            {outstanding > 0 ? 'Outstanding Balance' : overpaid > 0 ? 'Overpaid' : 'Fully Paid ✅'}
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1,
            color: outstanding > 0 ? '#FBBF24' : '#22C55E', fontFamily: 'var(--mono)', marginBottom: 16 }}>
            ${outstanding > 0 ? outstanding.toFixed(2) : overpaid > 0 ? overpaid.toFixed(2) : '0.00'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { lbl: 'Total earned', val: `$${totalEarned.toFixed(2)}`, c: 'rgba(255,255,255,0.5)' },
              { lbl: 'Total received', val: `$${totalPaid.toFixed(2)}`, c: '#22C55E' },
            ].map(({ lbl, val, c }) => (
              <div key={lbl} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{lbl}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c, letterSpacing: '-0.03em' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Record payment button */}
        {outstanding > 0 && (
          <button onClick={() => setShowPayForm(true)} style={{
            width: '100%', padding: '14px', border: 'none', cursor: 'pointer',
            background: 'rgba(251,191,36,0.15)', borderTop: '1px solid rgba(251,191,36,0.15)',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#FBBF24',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            💰 Record a Payment
          </button>
        )}
      </div>

      {/* Payment form */}
      {showPayForm && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--bdr)', borderRadius: 16,
          padding: 16, marginBottom: 16, boxShadow: 'var(--shd)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 14 }}>
            Record Payment
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Amount ($)</div>
              <input
                id="pay-amount"
                type="number"
                defaultValue={outstanding.toFixed(2)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--bdr)',
                  background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit', fontSize: 15,
                  fontWeight: 700, outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Method</div>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--bdr)',
                  background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit', fontSize: 13,
                  fontWeight: 600, outline: 'none' }}>
                <option value="cash">Cash</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6 }}>Note (optional)</div>
            <input
              type="text"
              placeholder="e.g. Week 1 payment"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--bdr)',
                background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setShowPayForm(false)} style={{ padding: '11px', borderRadius: 10,
              border: '1px solid var(--bdr)', background: 'var(--s2)', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => recordPayment(document.getElementById('pay-amount').value)}
              disabled={paying} style={{ padding: '11px', borderRadius: 10, border: 'none',
              background: '#FBBF24', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              color: '#000', cursor: 'pointer', opacity: paying ? 0.6 : 1 }}>
              {paying ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 10 }}>Payment History</div>
          {payments.map((p, i) => (
            <div key={p.id} style={{ background: 'var(--s1)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: 'var(--shd)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{p.note}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                  {fmtShort(p.date)} · {p.method}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#22C55E', letterSpacing: '-0.02em' }}>
                +${p.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day by day breakdown */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 10 }}>Days Breakdown</div>

      {dayStatus.map(day => (
        <div key={day.date} style={{
          background: 'var(--s1)', borderRadius: 14, padding: '13px 14px', marginBottom: 8,
          border: `1px solid ${day.status === 'paid' ? 'rgba(34,197,94,0.2)' : day.status === 'partial' ? 'rgba(251,191,36,0.2)' : 'var(--bdr)'}`,
          boxShadow: 'var(--shd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>
              {fmtDate(day.date)}
            </div>
            {day.status === 'partial' && (
              <div style={{ fontSize: 11, color: '#FBBF24' }}>
                ${day.coveredAmount.toFixed(2)} paid · ${day.partialRemaining.toFixed(2)} outstanding
              </div>
            )}
            {day.status === 'unpaid' && (
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Not yet paid</div>
            )}
            {day.status === 'paid' && (
              <div style={{ fontSize: 11, color: '#22C55E' }}>Fully covered ✅</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
                color: day.status === 'paid' ? '#22C55E' : day.status === 'partial' ? '#FBBF24' : 'var(--t1)' }}>
                ${Number(day.earned).toFixed(2)}
              </div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, flexShrink: 0,
              background: day.status === 'paid' ? 'rgba(34,197,94,0.15)'
                        : day.status === 'partial' ? 'rgba(251,191,36,0.15)'
                        : 'var(--s3)',
            }}>
              {day.status === 'paid' ? '✅' : day.status === 'partial' ? '🟡' : '🔴'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

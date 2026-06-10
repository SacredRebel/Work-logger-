import { useState } from 'react';
import { fmtDate, fmtShort } from '../lib/data';


function RateCalculator({ unpaidHrs, color }) {
  const [tab, setTab] = useState('50');
  const [splits, setSplits] = useState([
    { hrs: 42, rate: 25 },
    { hrs: 50, rate: 35 },
    { hrs: 50, rate: 40 },
  ]);
  const RATES = [25, 30, 35, 40, 45, 50];

  const at50 = unpaidHrs * 50;
  const at40 = unpaidHrs * 40;
  const splitTotal = splits.reduce((s, r) => s + r.hrs * r.rate, 0);
  const splitHrs = splits.reduce((s, r) => s + r.hrs, 0);
  const activeTotal = tab === '50' ? at50 : tab === '40' ? at40 : splitTotal;

  function update(i, field, val) {
    setSplits(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: Number(val) } : r));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 10 }}>Rate Calculator</div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--s2)', borderRadius: 12, padding: 3,
        gap: 3, marginBottom: 14, border: '1px solid var(--bdr)' }}>
        {[{k:'50',label:'$50 / hr'},{k:'40',label:'$40 / hr'},{k:'custom',label:'✏️ Custom'}].map(({k,label}) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
            background: tab === k ? color : 'transparent',
            color: tab === k ? '#fff' : 'var(--t3)',
          }}>{label}</button>
        ))}
      </div>

      {/* Result */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--bdr)', background: 'var(--s1)' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: tab === 'custom' ? '1px solid var(--bdr)' : 'none' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginBottom: 3 }}>
              {tab === 'custom'
                ? `${splitHrs} hrs — custom blend`
                : `${unpaidHrs} unpaid hrs × $${tab}/hr`}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: color, letterSpacing: '-0.05em', fontFamily: 'var(--mono)' }}>
              ${activeTotal.toFixed(2)}
            </div>
          </div>
          {tab === 'custom' && (
            <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'right',
              color: splitHrs === Math.round(unpaidHrs) ? '#22C55E' : '#FBBF24' }}>
              {splitHrs === Math.round(unpaidHrs) ? '✅ All hrs' : `⚠️ ${splitHrs}/${Math.round(unpaidHrs)} hrs`}
            </div>
          )}
        </div>

        {/* Custom rows */}
        {tab === 'custom' && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {splits.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" value={row.hrs} min={0}
                  onChange={e => update(i, 'hrs', e.target.value)}
                  style={{ width: 56, padding: '8px 6px', borderRadius: 8, border: '1px solid var(--bdr)',
                    background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none' }}
                />
                <span style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>hrs @</span>
                <select value={row.rate} onChange={e => update(i, 'rate', e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bdr)',
                    background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                  {RATES.map(r => <option key={r} value={r}>${r} / hr</option>)}
                </select>
                <span style={{ fontSize: 13, fontWeight: 800, color: color, minWidth: 58,
                  textAlign: 'right', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  ${(row.hrs * row.rate).toFixed(0)}
                </span>
                {splits.length > 1 && (
                  <button onClick={() => setSplits(p => p.filter((_,j)=>j!==i))} style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: 'rgba(239,68,68,0.12)', color: '#EF4444', cursor: 'pointer',
                    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                )}
              </div>
            ))}
            <button onClick={() => setSplits(p => [...p, {hrs:0, rate:50}])} style={{
              padding: '7px', borderRadius: 8, border: `1px dashed ${color}50`,
              background: `${color}08`, color: color, fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 2 }}>
              + Add row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingTab({ project, entries, onMarkPaid }) {
  const [rateTab, setRateTab] = useState('50');
  const [customSplits, setCustomSplits] = useState([
    { hrs: 42, rate: 25 },
    { hrs: 50, rate: 30 },
    { hrs: 50, rate: 35 },
  ]);
  const [showCustom, setShowCustom] = useState(false);
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
          {/* Rate toggle pills */}
          {outstanding > 0 && (() => {
            const unpaidHrs = Math.round(outstanding / 50 * 10) / 10;
            const RATES = [25,30,35,40,45,50];
            const splitTotal = customSplits.reduce((s,r)=>s+r.hrs*r.rate,0);
            const displayAmt = rateTab==='50' ? outstanding : rateTab==='40' ? unpaidHrs*40 : splitTotal;
            return (
              <>
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                  <div style={{display:'flex',gap:6}}>
                    {[{k:'50',label:'$50/hr'},{k:'40',label:'$40/hr'},{k:'custom',label:'✏️ Custom'}].map(({k,label})=>(
                      <button key={k} onClick={()=>{setRateTab(k);if(k==='custom')setShowCustom(true);else setShowCustom(false);}} style={{
                        padding:'6px 11px',borderRadius:10,cursor:'pointer',
                        fontFamily:'inherit',fontSize:11,fontWeight:800,
                        border: rateTab===k ? '1.5px solid rgba(251,191,36,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
                        background:rateTab===k?'rgba(251,191,36,0.18)':'rgba(255,255,255,0.05)',
                        color:rateTab===k?'#FBBF24':'rgba(255,255,255,0.4)',
                        transition:'all 0.15s',
                        letterSpacing:'0.01em',
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1,
                  color: '#FBBF24', fontFamily: 'var(--mono)', marginBottom: 8 }}>
                  ${displayAmt.toFixed(2)}
                </div>
                {(

                  <div style={{fontSize:11,color:'rgba(251,191,36,0.6)',marginBottom:8}}>
                    {rateTab==='40' ? `${unpaidHrs} hrs × $40/hr` : `Custom blend — ${customSplits.reduce((s,r)=>s+r.hrs,0)} hrs`}
                  </div>
                )}
                {showCustom && rateTab==='custom' && (
                  <div style={{background:'rgba(0,0,0,0.2)',borderRadius:10,padding:'10px 12px',marginBottom:8,display:'flex',flexDirection:'column',gap:7}}>
                    {customSplits.map((row,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                        <input type="number" value={row.hrs} min={0}
                          onChange={e=>setCustomSplits(p=>p.map((r,j)=>j===i?{...r,hrs:Number(e.target.value)}:r))}
                          style={{width:48,padding:'6px',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',
                            background:'rgba(255,255,255,0.07)',color:'#fff',fontFamily:'inherit',
                            fontSize:13,fontWeight:700,textAlign:'center',outline:'none'}}/>
                        <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',flexShrink:0}}>hrs @</span>
                        <select value={row.rate} onChange={e=>setCustomSplits(p=>p.map((r,j)=>j===i?{...r,rate:Number(e.target.value)}:r))}
                          style={{flex:1,padding:'6px 8px',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',
                            background:'rgba(255,255,255,0.07)',color:'#fff',fontFamily:'inherit',
                            fontSize:13,fontWeight:700,outline:'none',cursor:'pointer'}}>
                          {RATES.map(r=><option key={r} value={r} style={{background:'#1a1a1a'}}>${r}/hr</option>)}
                        </select>
                        <span style={{fontSize:12,fontWeight:800,color:'#FBBF24',minWidth:50,textAlign:'right',fontFamily:'var(--mono)'}}>
                          ${(row.hrs*row.rate).toFixed(0)}
                        </span>
                        {customSplits.length>1&&<button onClick={()=>setCustomSplits(p=>p.filter((_,j)=>j!==i))}
                          style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(239,68,68,0.2)',
                            color:'#EF4444',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>}
                      </div>
                    ))}
                    <button onClick={()=>setCustomSplits(p=>[...p,{hrs:0,rate:50}])}
                      style={{padding:'5px',borderRadius:7,border:'1px dashed rgba(251,191,36,0.3)',
                        background:'transparent',color:'#FBBF24',fontFamily:'inherit',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      + Add row
                    </button>
                  </div>
                )}
              </>
            );
          })()}
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
                <option value="Cash">Cash</option>
                <option value="ACH Transfer">ACH Transfer</option>
                <option value="Venmo">Venmo</option>
                <option value="Zelle">Zelle</option>
                <option value="Check">Check</option>
                <option value="PayPal">PayPal</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6 }}>Note (optional)</div>
            <input
              type="text"
              placeholder="e.g. Week 1 — Days 3,4,5"
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
            <div key={p.id} style={{ background: 'var(--s1)', border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: 14, padding: '14px', marginBottom: 8, boxShadow: 'var(--shd)' }}>
              {/* Top row — amount + method badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#22C55E', letterSpacing: '-0.04em', fontFamily: 'var(--mono)' }}>
                  +${p.amount.toFixed(2)}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999,
                  background: 'rgba(34,197,94,0.12)', color: '#22C55E', letterSpacing: '0.02em' }}>
                  {p.method}
                </span>
              </div>
              {/* Date row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: p.note ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>
                  📅 {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {/* Note */}
              {p.note && (
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, paddingTop: 8,
                  borderTop: '1px solid var(--bdr)', marginTop: 0 }}>
                  {p.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Rate Calculator ── */}
      {outstanding > 0 && (() => {
        const totalUnpaidHrs = Math.round((outstanding / 50) * 10) / 10;
        const RATES = [25, 30, 35, 40, 45, 50];
        return <RateCalculator unpaidHrs={totalUnpaidHrs} color={color} />;
      })()}

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

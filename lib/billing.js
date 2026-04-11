// Given a project's payments and its entries, compute paid status for each entry date
export function computePayStatus(payments, entries) {
  const sorted = [...entries]
    .filter(e => e.earned > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let remaining = (payments || []).reduce((s, p) => s + p.amount, 0);
  const status = {};

  for (const e of sorted) {
    const earned = Number(e.earned) || 0;
    if (remaining >= earned) {
      remaining -= earned;
      status[e.date] = 'paid';
    } else if (remaining > 0) {
      remaining = 0;
      status[e.date] = 'partial';
    } else {
      status[e.date] = 'unpaid';
    }
  }
  return status; // { 'YYYY-MM-DD': 'paid' | 'partial' | 'unpaid' }
}

export function PayBadge({ status, small = false }) {
  if (!status) return null;
  const cfg = {
    paid:    { label: 'Paid',     bg: 'rgba(34,197,94,0.15)',  color: '#22C55E', dot: '✅' },
    partial: { label: 'Partial',  bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', dot: '🟡' },
    unpaid:  { label: 'Unpaid',   bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', dot: '🔴' },
  }[status];
  if (!cfg) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 9999,
      background: cfg.bg,
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      color: cfg.color,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.dot} {cfg.label}
    </span>
  );
}

// Returns the payment(s) that apply to a specific entry date, with coverage details
export function getPaymentsForDay(payments, entries, targetDate) {
  const sorted = [...entries]
    .filter(e => e.earned > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let remaining = 0;
  const result = [];

  for (const pay of (payments || [])) {
    remaining += pay.amount;
  }

  // Walk through days and track which payment pool covers each
  let pool = (payments || []).reduce((s, p) => s + p.amount, 0);

  for (const e of sorted) {
    const earned = Number(e.earned) || 0;
    if (e.date === targetDate) {
      if (pool >= earned) {
        // fully covered — find the payment(s)
        return { covered: earned, outstanding: 0, payments: payments || [] };
      } else if (pool > 0) {
        return { covered: pool, outstanding: earned - pool, payments: payments || [] };
      } else {
        return { covered: 0, outstanding: earned, payments: [] };
      }
    }
    pool = Math.max(0, pool - earned);
  }
  return { covered: 0, outstanding: 0, payments: [] };
}

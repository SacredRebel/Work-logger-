import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function WeekBarChart({ data, accent }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--sep)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text1)' }}
          cursor={{ fill: 'var(--accent-dim)' }}
          formatter={(v) => [`${v}h`, 'Hours']}
        />
        <Bar dataKey="hours" fill={accent || '#FF6B35'} radius={[6, 6, 3, 3]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--sep)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text1)' }}
          formatter={(v) => [`${v.toFixed(1)}h`]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

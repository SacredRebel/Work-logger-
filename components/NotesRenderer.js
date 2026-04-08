export default function NotesRenderer({ sections, notes, accentColor }) {
  const c = accentColor || '#F97316';
  if (sections && sections.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {sections.map((sec, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <div style={{ width: 3, height: 13, background: c, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', color: c }}>
                {sec.title}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 10 }}>
              {sec.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: c, opacity: 0.45, flexShrink: 0, marginTop: 7 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--t2)', fontWeight: 450 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (notes) return <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t2)', whiteSpace: 'pre-wrap' }}>{notes}</p>;
  return null;
}

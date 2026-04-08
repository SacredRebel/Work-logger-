// Renders structured sections or falls back to plain text gracefully
export default function NotesRenderer({ sections, notes, accentColor }) {
  const color = accentColor || '#FF6B35';

  if (sections && sections.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map((sec, i) => (
          <div key={i}>
            {/* Section title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                color: color,
              }}>
                {sec.title}
              </span>
            </div>
            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 11 }}>
              {sec.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color,
                    opacity: 0.5,
                    flexShrink: 0,
                    marginTop: 6,
                  }} />
                  <span style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--text2)',
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: plain text
  if (notes) {
    return (
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
        {notes}
      </p>
    );
  }

  return null;
}

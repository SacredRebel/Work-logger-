export default function NotesRenderer({ sections, notes, color }) {
  const c = color || '#FF6B35';
  if (sections?.length > 0) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {sections.map((s, i) => (
        <div key={i}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
            <div style={{ width:3, height:12, background:c, borderRadius:2, flexShrink:0 }} />
            <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:c }}>{s.title}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, paddingLeft:10 }}>
            {s.items.map((item, j) => (
              <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:c, opacity:0.4, flexShrink:0, marginTop:6 }} />
                <span style={{ fontSize:13, lineHeight:1.65, color:'var(--t2)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  if (notes) return <p style={{ fontSize:13, lineHeight:1.7, color:'var(--t2)', whiteSpace:'pre-wrap' }}>{notes}</p>;
  return null;
}

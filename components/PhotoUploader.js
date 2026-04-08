import { useState, useRef } from 'react';

export default function PhotoUploader({ projectId, date, onUploaded, accentColor }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [selected, setSelected] = useState(null); // 'before' | 'after'
  const inputRef = useRef();
  const c = accentColor || '#F97316';

  async function handleFiles(files, type) {
    if (!files.length) return;
    setUploading(true);
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Uploading ${type} ${i+1} of ${files.length}…`);
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const filename = `${date}-${type}-${Date.now()}-${i+1}.${ext}`;
      const up = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename, projectId }),
      });
      if (!up.ok) { setProgress('Upload failed'); continue; }
      const { url } = await up.json();
      await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-image',
          payload: { date, project: projectId, imageData: { type, url, caption: '' } }
        }),
      });
      results.push(url);
    }
    setUploading(false);
    setProgress('');
    setSelected(null);
    if (onUploaded) onUploaded(results);
  }

  function pick(type) {
    setSelected(type);
    // reset input then click
    inputRef.current.value = '';
    inputRef.current.onchange = e => handleFiles(Array.from(e.target.files), type);
    inputRef.current.click();
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:'none' }} />

      {uploading ? (
        <div style={{ background:'var(--bg3)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${c}40`, borderTopColor:c, animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
          <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{progress}</span>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>
            Add Photos
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {/* Before button */}
            <button onClick={() => pick('before')} style={{
              padding:'12px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'1.5px dashed rgba(251,191,36,0.5)',
              background:'rgba(251,191,36,0.07)', transition:'all 0.15s',
            }}
            onPointerDown={e=>e.currentTarget.style.background='rgba(251,191,36,0.15)'}
            onPointerUp={e=>e.currentTarget.style.background='rgba(251,191,36,0.07)'}
            onPointerLeave={e=>e.currentTarget.style.background='rgba(251,191,36,0.07)'}
            >
              <span style={{ fontSize:20 }}>📸</span>
              <span style={{ fontSize:12, fontWeight:700, color:'#FBBF24' }}>Before</span>
            </button>
            {/* After button */}
            <button onClick={() => pick('after')} style={{
              padding:'12px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:`1.5px dashed ${c}50`,
              background:`${c}08`, transition:'all 0.15s',
            }}
            onPointerDown={e=>e.currentTarget.style.background=`${c}18`}
            onPointerUp={e=>e.currentTarget.style.background=`${c}08`}
            onPointerLeave={e=>e.currentTarget.style.background=`${c}08`}
            >
              <span style={{ fontSize:20 }}>✅</span>
              <span style={{ fontSize:12, fontWeight:700, color:c }}>After</span>
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

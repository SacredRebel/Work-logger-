import { useState, useRef } from 'react';

function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function uploadOne(base64, filename, projectId, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64.replace(/^data:image\/\w+;base64,/, ''),
          filename, projectId,
        }),
      });
      if (res.ok) return await res.json();
      if (attempt === retries) throw new Error(`Upload failed: ${res.status}`);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

// Poll /api/logs until the new URLs appear — confirms GitHub write is visible
async function waitForImages(expectedUrls, maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const r = await fetch('/api/logs?t=' + Date.now());
      if (!r.ok) continue;
      const data = await r.json();
      const allUrls = new Set(
        (data.entries || []).flatMap(e => (e.images || []).map(i => i.url))
      );
      if (expectedUrls.every(u => allUrls.has(u))) return true;
    } catch {}
  }
  return false; // timed out — caller still updates UI optimistically
}

export default function PhotoUploader({ projectId, date, onUploaded, accentColor }) {
  const [state, setState] = useState('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [errMsg, setErrMsg] = useState('');
  const inputRef = useRef();
  const c = accentColor || '#F97316';

  async function handleFiles(files, type) {
    if (!files.length) return;
    setErrMsg('');
    setState('compressing');
    setProgress({ done: 0, total: files.length, label: '' });

    try {
      // 1 — Compress all in parallel
      const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));

      setState('uploading');
      setProgress({ done: 0, total: files.length, label: 'Uploading…' });

      // 2 — Upload all in parallel
      const uploadedUrls = [];
      const results = [];
      await Promise.all(compressed.map(async (base64, i) => {
        const filename = `${date}-${type}-${Date.now()}-${i}.jpg`;
        const result = await uploadOne(base64, filename, projectId);
        results.push({ type, url: result.url, caption: '' });
        uploadedUrls.push(result.url);
        setProgress(p => ({ ...p, done: p.done + 1, label: `Uploaded ${p.done + 1}/${files.length}` }));
      }));

      // 3 — Single batch write to logs.json
      setState('saving');
      setProgress(p => ({ ...p, label: 'Saving to log…' }));
      const saveRes = await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-images-batch',
          payload: { date, project: projectId, images: results },
        }),
      });
      if (!saveRes.ok) throw new Error('Failed to save to log');

      // 4 — Optimistically update UI immediately
      setState('verifying');
      setProgress(p => ({ ...p, label: 'Confirming…' }));
      if (onUploaded) onUploaded(results); // update UI NOW with new images

      // 5 — Wait for GitHub to confirm (background) then refresh once more
      waitForImages(uploadedUrls).then(confirmed => {
        if (onUploaded) onUploaded(results); // second refresh once confirmed
      });

      setState('done');
      setTimeout(() => setState('idle'), 1800);

    } catch (e) {
      setErrMsg(e.message || 'Upload failed — tap to retry');
      setState('error');
    }
  }

  function pick(type) {
    inputRef.current.value = '';
    inputRef.current.onchange = e => handleFiles(Array.from(e.target.files), type);
    inputRef.current.click();
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:'none' }} />

      {state === 'idle' && (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>
            Add Photos
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={() => pick('before')} style={{
              padding:'12px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              border:'1.5px dashed rgba(251,191,36,0.5)', background:'rgba(251,191,36,0.07)', transition:'background 0.15s',
            }}
            onPointerDown={e=>e.currentTarget.style.background='rgba(251,191,36,0.18)'}
            onPointerUp={e=>e.currentTarget.style.background='rgba(251,191,36,0.07)'}
            onPointerLeave={e=>e.currentTarget.style.background='rgba(251,191,36,0.07)'}>
              <span style={{ fontSize:20 }}>📸</span>
              <span style={{ fontSize:12, fontWeight:700, color:'#FBBF24' }}>Before</span>
            </button>
            <button onClick={() => pick('after')} style={{
              padding:'12px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              border:`1.5px dashed ${c}50`, background:`${c}08`, transition:'background 0.15s',
            }}
            onPointerDown={e=>e.currentTarget.style.background=`${c}20`}
            onPointerUp={e=>e.currentTarget.style.background=`${c}08`}
            onPointerLeave={e=>e.currentTarget.style.background=`${c}08`}>
              <span style={{ fontSize:20 }}>✅</span>
              <span style={{ fontSize:12, fontWeight:700, color:c }}>After</span>
            </button>
          </div>
        </div>
      )}

      {(state === 'compressing' || state === 'uploading' || state === 'saving' || state === 'verifying') && (
        <div style={{ background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>
              {state === 'compressing' && '⚡ Optimizing…'}
              {state === 'uploading'   && `📤 ${progress.label}`}
              {state === 'saving'      && '💾 Saving to log…'}
              {state === 'verifying'   && '✅ Confirming…'}
            </span>
            {state === 'uploading' && (
              <span style={{ fontSize:12, fontWeight:700, color:c }}>{pct}%</span>
            )}
          </div>
          <div style={{ height:4, background:'var(--s3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:2,
              background:`linear-gradient(90deg,${c},${c}cc)`,
              width: state === 'compressing' ? '20%'
                   : state === 'uploading'   ? `${pct}%`
                   : state === 'saving'      ? '90%'
                   : '100%',
              transition:'width 0.35s ease',
            }}/>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div style={{ background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.25)',
          borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:13, fontWeight:600, color:'#22C55E' }}>Photos saved!</span>
        </div>
      )}

      {state === 'error' && (
        <div style={{ borderRadius:12, overflow:'hidden' }}>
          <div style={{ background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)',
            padding:'12px 16px', marginBottom:8 }}>
            <span style={{ fontSize:13, color:'#EF4444', fontWeight:500 }}>⚠️ {errMsg}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>setState('idle')} style={{ padding:'10px', borderRadius:10,
              border:'1px solid var(--bdr)', background:'var(--s2)', fontFamily:'inherit',
              fontSize:12, fontWeight:700, color:'var(--t2)', cursor:'pointer' }}>Cancel</button>
            <button onClick={()=>setState('idle')} style={{ padding:'10px', borderRadius:10,
              border:'none', background:c, fontFamily:'inherit',
              fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>Try Again</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

import { useState, useRef } from 'react';

// Compress + resize image before upload — target ~400KB max
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result); // base64 data URL
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Upload one image with retry
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
      await new Promise(r => setTimeout(r, 800 * (attempt + 1))); // backoff
    }
  }
}

export default function PhotoUploader({ projectId, date, onUploaded, accentColor }) {
  const [state, setState] = useState('idle'); // idle | compressing | uploading | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errMsg, setErrMsg] = useState('');
  const inputRef = useRef();
  const c = accentColor || '#F97316';

  async function handleFiles(files, type) {
    if (!files.length) return;
    setErrMsg('');
    setState('compressing');
    setProgress({ done: 0, total: files.length });

    try {
      // Step 1 — compress all images in parallel
      const compressed = await Promise.all(
        Array.from(files).map(f => compressImage(f))
      );

      setState('uploading');
      setProgress({ done: 0, total: files.length });

      // Step 2 — upload all in parallel
      const results = [];
      await Promise.all(compressed.map(async (base64, i) => {
        const filename = `${date}-${type}-${Date.now()}-${i}.jpg`;
        const result = await uploadOne(base64, filename, projectId);
        results.push({ type, url: result.url, caption: '' });
        setProgress(p => ({ ...p, done: p.done + 1 }));
      }));

      // Step 3 — single logs.json update with all images at once
      const res = await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-images-batch',
          payload: { date, project: projectId, images: results },
        }),
      });
      if (!res.ok) throw new Error('Failed to save to log');

      setState('done');
      setTimeout(() => { setState('idle'); if (onUploaded) onUploaded(results); }, 800);

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
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} />

      {state === 'idle' && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>
            Add Photos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => pick('before')} style={{
              padding: '12px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              border: '1.5px dashed rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.07)',
              transition: 'background 0.15s',
            }}
            onPointerDown={e => e.currentTarget.style.background = 'rgba(251,191,36,0.18)'}
            onPointerUp={e => e.currentTarget.style.background = 'rgba(251,191,36,0.07)'}
            onPointerLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.07)'}
            >
              <span style={{ fontSize: 20 }}>📸</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#FBBF24' }}>Before</span>
            </button>
            <button onClick={() => pick('after')} style={{
              padding: '12px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              border: `1.5px dashed ${c}50`, background: `${c}08`,
              transition: 'background 0.15s',
            }}
            onPointerDown={e => e.currentTarget.style.background = `${c}20`}
            onPointerUp={e => e.currentTarget.style.background = `${c}08`}
            onPointerLeave={e => e.currentTarget.style.background = `${c}08`}
            >
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c }}>After</span>
            </button>
          </div>
        </div>
      )}

      {(state === 'compressing' || state === 'uploading') && (
        <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
              {state === 'compressing' ? '⚡ Optimizing images…' : `📤 Uploading ${progress.done}/${progress.total}`}
            </span>
            {state === 'uploading' && (
              <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{pct}%</span>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${c}, ${c}cc)`,
              width: state === 'compressing' ? '30%' : `${pct}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {state === 'done' && (
        <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>Photos saved!</span>
        </div>
      )}

      {state === 'error' && (
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>⚠️ {errMsg}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button onClick={() => setState('idle')} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--s2)', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => { setState('idle'); }} style={{ padding: '10px', borderRadius: 10, border: 'none', background: c, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

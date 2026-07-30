import { useState, useRef } from 'react';

function compressImage(file, maxPx = 1100, quality = 0.76) {
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
        body: JSON.stringify({ imageBase64: base64.replace(/^data:image\/\w+;base64,/, ''), filename, projectId }),
      });
      if (res.ok) return await res.json();
      const errBody = await res.json().catch(() => ({}));
      if (attempt === retries) throw new Error(errBody.error || `Upload failed: ${res.status}`);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

async function waitForImages(expectedUrls, maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const r = await fetch('/api/logs?t=' + Date.now());
      if (!r.ok) continue;
      const data = await r.json();
      const allUrls = new Set((data.entries || []).flatMap(e => (e.images || []).map(i => i.url)));
      if (expectedUrls.every(u => allUrls.has(u))) return true;
    } catch {}
  }
  return false;
}

const SUGGESTED_GROUPS = ['Door 1', 'Door 2', 'Door 3', 'Bathroom', 'Hallway', 'Office Room', 'Ceiling', 'Trim', 'Window'];

export default function PhotoUploader({ projectId, date, onUploaded, accentColor, existingGroups = [] }) {
  const [step, setStep] = useState('idle'); // idle | group | type | uploading | done | error
  const [group, setGroup] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [uploadType, setUploadType] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [errMsg, setErrMsg] = useState('');
  const inputRef = useRef();
  const c = accentColor || '#F97316';

  // Merge suggested + existing groups from this entry, deduplicated
  const allSuggestions = [...new Set([...existingGroups, ...SUGGESTED_GROUPS])];
  const finalGroup = group === '__custom__' ? customGroup.trim() : group;

  async function handleFiles(files, type) {
    if (!files.length) return;
    setStep('uploading');
    setProgress({ done: 0, total: files.length, label: '' });
    setErrMsg('');
    try {
      const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
      const results = [];
      // Upload sequentially — GitHub's Contents API rejects/fails concurrent writes to the same branch
      for (let i = 0; i < compressed.length; i++) {
        const base64 = compressed[i];
        const filename = `${date}-${type}-${Date.now()}-${i}.jpg`;
        const result = await uploadOne(base64, filename, projectId);
        results.push({ type, url: result.url, caption: finalGroup || '', group: finalGroup || '' });
        setProgress(p => ({ ...p, done: p.done + 1, label: `${p.done + 1}/${files.length}` }));
      }
      const saveRes = await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-images-batch', payload: { date, project: projectId, images: results } }),
      });
      if (!saveRes.ok) throw new Error('Failed to save');
      if (onUploaded) onUploaded(results);
      waitForImages(results.map(r => r.url)).then(() => { if (onUploaded) onUploaded(results); });
      setStep('done');
      setTimeout(() => { setStep('idle'); setGroup(''); setCustomGroup(''); setUploadType(null); }, 2000);
    } catch (e) {
      setErrMsg(e.message || 'Upload failed');
      setStep('error');
    }
  }

  function pickFiles(type) {
    setUploadType(type);
    inputRef.current.value = '';
    inputRef.current.onchange = e => handleFiles(Array.from(e.target.files), type);
    inputRef.current.click();
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} />

      {/* ── IDLE — show Add Photos button ── */}
      {step === 'idle' && (
        <button onClick={() => setStep('group')} style={{
          width: '100%', padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: `1.5px dashed ${c}45`, background: `${c}08`, transition: 'background 0.15s',
        }}
        onPointerDown={e => e.currentTarget.style.background = `${c}18`}
        onPointerUp={e => e.currentTarget.style.background = `${c}08`}
        onPointerLeave={e => e.currentTarget.style.background = `${c}08`}>
          <span style={{ fontSize: 17 }}>📷</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: c }}>Add Photos</span>
        </button>
      )}

      {/* ── STEP 1 — Pick or type group name ── */}
      {step === 'group' && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--bdr)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shd)' }}>
          <div style={{ padding: '12px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What are you photographing?</span>
            <button onClick={() => setStep('idle')} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Quick pick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {allSuggestions.map(s => (
                <button key={s} onClick={() => { setGroup(s); setStep('type'); }} style={{
                  padding: '6px 13px', borderRadius: 9999, border: '1px solid var(--bdr)',
                  background: group === s ? c : 'var(--s2)', color: group === s ? '#fff' : 'var(--t2)',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Or type custom name…"
                value={customGroup}
                onChange={e => { setCustomGroup(e.target.value); setGroup('__custom__'); }}
                onKeyDown={e => { if (e.key === 'Enter' && customGroup.trim()) setStep('type'); }}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--s2)', color: 'var(--t1)', fontFamily: 'inherit', fontSize: 16, outline: 'none' }}
              />
              <button
                onClick={() => { if (finalGroup) setStep('type'); }}
                disabled={!finalGroup}
                style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: finalGroup ? c : 'var(--s3)', color: finalGroup ? '#fff' : 'var(--t4)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: finalGroup ? 'pointer' : 'default' }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Pick Before or After ── */}
      {step === 'type' && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--bdr)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shd)' }}>
          <div style={{ padding: '12px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setStep('group')} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, padding: 0 }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>📁 {finalGroup}</span>
            </div>
            <button onClick={() => setStep('idle')} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Select photo type
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => pickFiles('before')} style={{
                padding: '16px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                border: '1.5px dashed rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.07)',
              }}>
                <span style={{ fontSize: 24 }}>📸</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24' }}>Before</span>
                <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 500 }}>Shows on left</span>
              </button>
              <button onClick={() => pickFiles('after')} style={{
                padding: '16px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                border: `1.5px dashed ${c}50`, background: `${c}08`,
              }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: c }}>After</span>
                <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 500 }}>Shows on right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOADING ── */}
      {step === 'uploading' && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
              📤 Uploading {progress.label} to {finalGroup}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${c},${c}cc)`, width: `${pct}%`, transition: 'width 0.3s ease' }}/>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>Photos saved to {finalGroup}!</span>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === 'error' && (
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', padding: '12px 16px', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>⚠️ {errMsg}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => { setStep('idle'); setGroup(''); setCustomGroup(''); }} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--bdr)', background: 'var(--s2)', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => setStep('type')} style={{ padding: '10px', borderRadius: 10, border: 'none', background: c, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

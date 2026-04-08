import { useEffect, useRef, useState } from 'react';

export default function Lightbox({ images, startIndex = 0, onClose, onDelete, projectId, date }) {
  const [idx, setIdx] = useState(startIndex);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const img = images[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < images.length - 1;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft' && hasPrev) setIdx(i => i - 1);
      if (e.key === 'ArrowRight' && hasNext) setIdx(i => i + 1);
      if (e.key === 'Escape') { setShowConfirm(false); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPrev, hasNext, onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Reset confirm when switching images
  useEffect(() => { setShowConfirm(false); }, [idx]);

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    if (showConfirm) return; // don't navigate when confirm is showing
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 60) { onClose(); return; }
    if (Math.abs(dx) > 50) {
      if (dx < 0 && hasNext) setIdx(i => i + 1);
      if (dx > 0 && hasPrev) setIdx(i => i - 1);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.url, date, project: projectId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setShowConfirm(false);
      if (onDelete) onDelete(img.url);
      // Move to adjacent image or close
      if (images.length === 1) { onClose(); return; }
      setIdx(i => i > 0 ? i - 1 : 0);
    } catch (e) {
      alert('Could not delete image. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.97)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        touchAction:'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0,
        padding:'calc(env(safe-area-inset-top,0px) + 14px) 16px 18px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'linear-gradient(to bottom,rgba(0,0,0,0.75),transparent)', zIndex:10 }}>
        {/* Counter */}
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>
          {idx + 1} / {images.length}
        </div>
        {/* Type badge */}
        {img?.type && (
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase',
            padding:'4px 10px', borderRadius:9999,
            background: img.type==='before'?'rgba(251,191,36,0.85)':'rgba(34,197,94,0.85)', color:'#fff' }}>
            {img.type}
          </span>
        )}
        {/* Close */}
        <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%',
          background:'rgba(255,255,255,0.15)', border:'none', color:'#fff',
          fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ✕
        </button>
      </div>

      {/* Image */}
      {img && (
        <img key={idx} src={img.url} alt={img.caption || ''}
          style={{ maxWidth:'100%', maxHeight:'78dvh', objectFit:'contain', borderRadius:8,
            userSelect:'none', WebkitUserSelect:'none', animation:'lbIn 0.18s ease-out' }}
          onError={e => { e.target.style.opacity='0.3'; }}
        />
      )}

      {/* Caption */}
      {img?.caption && (
        <div style={{ position:'absolute', bottom:'calc(env(safe-area-inset-bottom,0px) + 90px)',
          left:24, right:24, textAlign:'center', fontSize:13,
          color:'rgba(255,255,255,0.5)', fontWeight:500 }}>
          {img.caption}
        </div>
      )}

      {/* Delete confirm overlay */}
      {showConfirm && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.88)', zIndex:20,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🗑️</div>
          <div style={{ fontSize:17, fontWeight:700, color:'#fff', marginBottom:8, textAlign:'center' }}>
            Delete this photo?
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:28, textAlign:'center', lineHeight:1.5 }}>
            This will permanently remove the image. This cannot be undone.
          </div>
          <div style={{ display:'flex', gap:12, width:'100%', maxWidth:280 }}>
            <button onClick={()=>setShowConfirm(false)} style={{ flex:1, padding:'13px 0', borderRadius:12,
              background:'rgba(255,255,255,0.12)', border:'none', color:'#fff',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
            <button onClick={confirmDelete} disabled={deleting} style={{ flex:1, padding:'13px 0', borderRadius:12,
              background:'#EF4444', border:'none', color:'#fff',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              opacity:deleting?0.6:1 }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{ position:'absolute', bottom:'calc(env(safe-area-inset-bottom,0px) + 16px)',
        left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>

        {/* Nav row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
          <button onClick={()=>hasPrev&&setIdx(i=>i-1)} style={{ width:42, height:42, borderRadius:'50%', border:'none',
            background:hasPrev?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)',
            color:hasPrev?'#fff':'rgba(255,255,255,0.2)', fontSize:22, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>

          {/* Dots */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {images.map((_,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{ height:6, borderRadius:3, cursor:'pointer',
                width:i===idx?20:6, background:i===idx?'#fff':'rgba(255,255,255,0.3)',
                transition:'all 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}/>
            ))}
          </div>

          <button onClick={()=>hasNext&&setIdx(i=>i+1)} style={{ width:42, height:42, borderRadius:'50%', border:'none',
            background:hasNext?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)',
            color:hasNext?'#fff':'rgba(255,255,255,0.2)', fontSize:22, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button onClick={()=>setShowConfirm(true)} style={{ display:'flex', alignItems:'center', gap:6,
            padding:'8px 18px', borderRadius:9999, border:'1px solid rgba(239,68,68,0.4)',
            background:'rgba(239,68,68,0.12)', color:'#EF4444',
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.02em' }}>
            🗑 Delete photo
          </button>
        )}

        <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:'0.06em',
          fontWeight:600, textTransform:'uppercase' }}>
          Swipe up/down to close
        </div>
      </div>

      <style>{`@keyframes lbIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

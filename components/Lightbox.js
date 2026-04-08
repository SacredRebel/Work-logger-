import { useEffect, useRef, useState } from 'react';

export default function Lightbox({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const touchStart = useRef(null);
  const touchStartY = useRef(null);

  const img = images[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < images.length - 1;

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft' && hasPrev) setIdx(i => i - 1);
      if (e.key === 'ArrowRight' && hasNext) setIdx(i => i + 1);
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPrev, hasNext, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStart.current = null;

    // Vertical swipe → close
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 60) {
      onClose();
      return;
    }
    // Horizontal swipe → navigate
    if (Math.abs(dx) > 50) {
      if (dx < 0 && hasNext) setIdx(i => i + 1);
      if (dx > 0 && hasPrev) setIdx(i => i - 1);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: 'calc(env(safe-area-inset-top,0px) + 14px) 18px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        zIndex: 10,
      }}>
        {/* Counter */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
          {idx + 1} / {images.length}
        </div>
        {/* Tag */}
        {img.type && (
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 9999,
            background: img.type === 'before' ? 'rgba(251,191,36,0.85)' : 'rgba(34,197,94,0.85)',
            color: '#fff',
          }}>
            {img.type}
          </span>
        )}
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Image */}
      <img
        key={idx}
        src={img.url}
        alt={img.caption || img.type || ''}
        style={{
          maxWidth: '100%', maxHeight: '80dvh',
          objectFit: 'contain', borderRadius: 8,
          userSelect: 'none', WebkitUserSelect: 'none',
          animation: 'lbFadeIn 0.18s ease-out',
        }}
        onError={e => { e.target.src = ''; }}
      />

      {/* Caption */}
      {img.caption && (
        <div style={{
          position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom,0px) + 72px)',
          left: 24, right: 24, textAlign: 'center',
          fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500,
        }}>
          {img.caption}
        </div>
      )}

      {/* Bottom nav arrows + dots */}
      <div style={{
        position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)',
        left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <button
          onClick={() => hasPrev && setIdx(i => i - 1)}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: hasPrev ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
            color: hasPrev ? '#fff' : 'rgba(255,255,255,0.2)',
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >‹</button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {images.map((_, i) => (
            <div
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => hasNext && setIdx(i => i + 1)}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: hasNext ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
            color: hasNext ? '#fff' : 'rgba(255,255,255,0.2)',
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >›</button>
      </div>

      {/* Swipe hint */}
      <div style={{
        position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom,0px) + 70px)',
        fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em',
        fontWeight: 600, textTransform: 'uppercase',
      }}>
        Swipe up/down to close
      </div>

      <style>{`@keyframes lbFadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

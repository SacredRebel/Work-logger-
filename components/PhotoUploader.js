import { useState, useRef } from 'react';

export default function PhotoUploader({ projectId, date, onUploaded, accentColor }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const inputRef = useRef();
  const color = accentColor || '#F97316';

  async function handleFiles(files) {
    if (!files.length) return;
    setUploading(true);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Uploading ${i+1} of ${files.length}…`);

      // Read as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${date}-${Date.now()}-${i+1}.${ext}`;

      // Upload image file to GitHub
      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename, projectId }),
      });

      if (!uploadRes.ok) { setProgress('Upload failed'); continue; }
      const { url } = await uploadRes.json();

      // Update logs.json
      await fetch('/api/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-image',
          payload: { date, project: projectId, imageData: { type: 'after', url, caption: '' } }
        }),
      });

      results.push(url);
    }

    setUploading(false);
    setProgress('');
    if (onUploaded) onUploaded(results);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(Array.from(e.target.files))}
      />

      {uploading ? (
        <div style={{
          background: 'var(--bg3)', borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: `2px solid ${color}40`, borderTopColor: color,
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }}/>
          <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{progress}</span>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current.click()}
          style={{
            width: '100%', padding: '13px 16px',
            background: `${color}12`, border: `1.5px dashed ${color}50`,
            borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onPointerDown={e => e.currentTarget.style.background=`${color}20`}
          onPointerUp={e => e.currentTarget.style.background=`${color}12`}
        >
          <span style={{ fontSize: 18 }}>📷</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>Add Photos</span>
        </button>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

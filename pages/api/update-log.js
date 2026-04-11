export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'No GitHub token' });

  const REPO = 'SacredRebel/Work-logger-';
  const path = 'data/logs.json';

  // Get current file + sha
  const getR = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!getR.ok) return res.status(500).json({ error: 'Could not fetch logs' });
  const { sha, content } = await getR.json();
  const current = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));

  const { action, payload } = req.body;

  // Single image (legacy)
  if (action === 'add-image') {
    const entry = current.entries.find(e => e.date === payload.date && e.project === payload.project);
    if (entry) { entry.images = entry.images || []; entry.images.push(payload.imageData); }
  }

  // Batch images — all at once, single GitHub write
  if (action === 'add-images-batch') {
    const entry = current.entries.find(e => e.date === payload.date && e.project === payload.project);
    if (entry) {
      entry.images = entry.images || [];
      entry.images.push(...payload.images);
    }
  }

  // Add payment to project
  if (action === 'add-payment') {
    const proj = current.projects.find(p => p.id === payload.projectId);
    if (proj) {
      proj.payments = proj.payments || [];
      proj.payments.push(payload.payment);
    }
  }

  // Update hours/earned/notes at end of day
  if (action === 'update-entry') {
    const idx = current.entries.findIndex(e => e.date === payload.date && e.project === payload.project);
    if (idx !== -1) Object.assign(current.entries[idx], payload.updates);
  }

  const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString('base64');
  const putR = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `log: ${action}`, content: newContent, sha }),
  });

  if (!putR.ok) {
    const err = await putR.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || `GitHub error ${putR.status}` });
  }

  res.status(200).json({ ok: true });
}

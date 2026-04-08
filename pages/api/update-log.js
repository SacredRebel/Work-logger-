export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = 'SacredRebel/Work-logger-';
  const path = 'data/logs.json';

  // Get current file + sha
  const getR = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!getR.ok) return res.status(500).json({ error: 'Could not fetch logs' });
  const { sha, content } = await getR.json();
  const current = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));

  // Apply update
  const { action, payload } = req.body;

  if (action === 'add-image') {
    const { date, project, imageData } = payload;
    const entry = current.entries.find(e => e.date === date && e.project === project);
    if (entry) {
      entry.images = entry.images || [];
      entry.images.push(imageData);
    }
  }

  const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString('base64');
  const putR = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `update: ${action}`, content: newContent, sha }),
  });

  if (!putR.ok) {
    const err = await putR.json();
    return res.status(500).json({ error: err.message });
  }

  res.status(200).json({ ok: true });
}

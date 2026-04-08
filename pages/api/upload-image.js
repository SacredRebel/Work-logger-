export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, filename, projectId } = req.body;
  if (!imageBase64 || !filename || !projectId) return res.status(400).json({ error: 'Missing fields' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = 'SacredRebel/Work-logger-';
  const path = `public/images/${projectId}/${filename}`;

  // Check if file exists first (to get sha for update)
  let sha;
  try {
    const check = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; }
  } catch {}

  const body = {
    message: `photo: add ${filename}`,
    content: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
    ...(sha ? { sha } : {})
  };

  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const err = await r.json();
    return res.status(500).json({ error: err.message });
  }

  res.status(200).json({ url: `/images/${projectId}/${filename}` });
}

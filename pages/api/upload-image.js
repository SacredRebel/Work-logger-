export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, filename, projectId } = req.body;
  if (!imageBase64 || !filename || !projectId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'No GitHub token configured' });

  const REPO = 'SacredRebel/Work-logger-';
  const path = `public/images/${projectId}/${filename}`;

  // Skip the SHA check — always create new file (unique filename guarantees no conflict)
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `photo: ${filename}`,
      content: imageBase64, // already stripped of data URL prefix by client
    }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || `GitHub error ${r.status}` });
  }

  // Return the public URL immediately — no need to wait for GitHub CDN
  res.status(200).json({ url: `/images/${projectId}/${filename}` });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageUrl, date, project } = req.body;
  if (!imageUrl || !date || !project) return res.status(400).json({ error: 'Missing fields' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO  = 'SacredRebel/Work-logger-';
  const headers = { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

  // ── 1. Remove from logs.json ───────────────────────────────
  const logsPath = 'data/logs.json';
  const logsRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${logsPath}`, { headers });
  if (!logsRes.ok) return res.status(500).json({ error: 'Could not fetch logs' });
  const { sha: logsSha, content } = await logsRes.json();
  const logs = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));

  const entry = logs.entries.find(e => e.date === date && e.project === project);
  if (entry) entry.images = (entry.images || []).filter(i => i.url !== imageUrl);

  const putLogs = await fetch(`https://api.github.com/repos/${REPO}/contents/${logsPath}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: `delete image: ${imageUrl}`, content: Buffer.from(JSON.stringify(logs, null, 2)).toString('base64'), sha: logsSha }),
  });
  if (!putLogs.ok) return res.status(500).json({ error: 'Could not update logs' });

  // ── 2. Delete the actual file from GitHub ─────────────────
  // Convert /images/project/file.jpg → public/images/project/file.jpg
  const filePath = 'public' + imageUrl;
  try {
    const fileRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, { headers });
    if (fileRes.ok) {
      const { sha: fileSha } = await fileRes.json();
      await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
        method: 'DELETE', headers,
        body: JSON.stringify({ message: `delete photo: ${filePath}`, sha: fileSha }),
      });
    }
  } catch {} // If file delete fails, log entry is already cleaned — non-fatal

  res.status(200).json({ ok: true });
}

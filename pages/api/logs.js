const OWNER  = 'SacredRebel'
const REPO   = 'Work-logger-'
const FILE   = 'data/logs.json'
const BRANCH = 'main'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const token = process.env.GITHUB_TOKEN

  // ── GET — always fetch from GitHub API (never CDN) ─────────
  if (req.method === 'GET') {
    if (!token) return res.status(503).json({ error: 'GITHUB_TOKEN not set' })
    try {
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}&t=${Date.now()}`
      const r = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      })
      if (!r.ok) throw new Error(`GitHub ${r.status}`)
      const { content } = await r.json()
      const data = JSON.parse(Buffer.from(content, 'base64').toString('utf8'))
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message, entries: [], projects: [], categories: [] })
    }
  }

  res.setHeader('Allow', ['GET'])
  res.status(405).end()
}

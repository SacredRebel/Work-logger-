const OWNER  = 'SacredRebel'
const REPO   = 'Work-logger-'
const FILE   = 'data/logs.json'
const BRANCH = 'main'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const token = process.env.GITHUB_TOKEN

  // Try GitHub API first (no cache)
  if (token) {
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
      if (r.ok) {
        const { content } = await r.json()
        const data = JSON.parse(Buffer.from(content, 'base64').toString('utf8'))
        return res.status(200).json(data)
      }
    } catch (e) {}
  }

  // Fallback — raw GitHub CDN (may be slightly cached but always works)
  try {
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}?t=${Date.now()}`
    const r = await fetch(url, { cache: 'no-store' })
    if (r.ok) {
      const data = await r.json()
      return res.status(200).json(data)
    }
  } catch (e) {}

  return res.status(500).json({ error: 'Could not load data', entries: [], projects: [], categories: [] })
}

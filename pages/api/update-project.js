const OWNER  = 'SacredRebel'
const REPO   = 'Work-logger-'
const FILE   = 'data/logs.json'
const BRANCH = 'main'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = process.env.GITHUB_TOKEN
  if (!token) return res.status(503).json({ error: 'No token' })

  const { projectId, rate } = req.body
  if (!projectId || rate === undefined) return res.status(400).json({ error: 'Missing fields' })

  try {
    // Get current file
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (!getRes.ok) throw new Error('Failed to fetch')
    const { content, sha } = await getRes.json()
    const data = JSON.parse(Buffer.from(content, 'base64').toString('utf8'))

    // Update project rate
    const proj = data.projects.find(p => p.id === projectId)
    if (!proj) return res.status(404).json({ error: 'Project not found' })
    proj.rate = Number(rate)

    // Push back
    const updated = Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
    const pushRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `update: ${projectId} rate → $${rate}/hr`, content: updated, sha, branch: BRANCH })
      }
    )
    if (!pushRes.ok) throw new Error('Failed to push')
    return res.status(200).json({ ok: true, rate })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

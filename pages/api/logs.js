const OWNER = 'SacredRebel'
const REPO = 'Work-logger-'
const FILE = 'data/logs.json'
const BRANCH = 'main'

async function getFileFromGitHub(token) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`
  const r = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  if (!r.ok) throw new Error(`GitHub GET failed: ${r.status}`)
  const data = await r.json()
  const content = Buffer.from(data.content, 'base64').toString('utf8')
  return { json: JSON.parse(content), sha: data.sha }
}

async function updateFileOnGitHub(token, content, sha, message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      sha,
      branch: BRANCH,
    }),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.message || 'GitHub PUT failed')
  }
  return r.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // GET — fetch all logs
  if (req.method === 'GET') {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}`
      const r = await fetch(rawUrl + '?t=' + Date.now(), { cache: 'no-store' })
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch logs' })
      const data = await r.json()
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message, entries: [] })
    }
  }

  // POST — add new entry
  if (req.method === 'POST') {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return res.status(503).json({ error: 'GITHUB_TOKEN not configured on Vercel' })
    }
    try {
      const entry = {
        id: Date.now().toString(),
        date: req.body.date || new Date().toISOString().split('T')[0],
        hours: parseFloat(req.body.hours) || 0,
        category: req.body.category || 'other',
        tasks: req.body.tasks || '',
        notes: req.body.notes || '',
        startHour: req.body.startHour || null,
        endHour: req.body.endHour || null,
        beforePhoto: req.body.beforePhoto || '',
        afterPhoto: req.body.afterPhoto || '',
      }
      const { json, sha } = await getFileFromGitHub(token)
      json.entries.unshift(entry)
      await updateFileOnGitHub(
        token,
        json,
        sha,
        `Log: ${entry.date} — ${entry.hours}h ${entry.category}`
      )
      return res.status(200).json({ success: true, entry })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // DELETE — remove entry by id
  if (req.method === 'DELETE') {
    const token = process.env.GITHUB_TOKEN
    if (!token) return res.status(503).json({ error: 'GITHUB_TOKEN not configured' })
    try {
      const { id } = req.query
      const { json, sha } = await getFileFromGitHub(token)
      json.entries = json.entries.filter(e => e.id !== id)
      await updateFileOnGitHub(token, json, sha, `Delete entry ${id}`)
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}

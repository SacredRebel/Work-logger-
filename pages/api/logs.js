export default async function handler(req, res) {
  try {
    const url = `https://raw.githubusercontent.com/sacredrebel/work-logger/main/data/logs.json?t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

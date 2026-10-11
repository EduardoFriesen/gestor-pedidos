export function parseChangelog(md) {
  const releases = []
  for (const line of md.split('\n')) {
    const head = line.match(/^##\s+v?(\d+\.\d+\.\d+)(?:\s+[—-]\s+(\S+))?/)
    if (head) releases.push({ version: head[1], date: head[2] || '', items: [] })
    else if (releases.length && /^[-*]\s+/.test(line)) releases.at(-1).items.push(line.replace(/^[-*]\s+/, '').trim())
  }
  return releases
}

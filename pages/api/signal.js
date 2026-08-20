const CONFIG = {
  bridgerton: { wiki: 'Bridgerton', reddit: 'femalefashionadvice', query: 'bridgerton fashion brand', news: 'Bridgerton brand partnership' },
  mj: { wiki: 'Michael_Jackson', reddit: 'malefashionadvice', query: 'michael jackson biopic style', news: 'Michael Jackson biopic fashion' },
  yellowstone: { wiki: 'Yellowstone_(American_TV_series)', reddit: 'television', query: 'yellowstone western aesthetic', news: 'Yellowstone fashion tourism' },
  euphoria: { wiki: 'Euphoria_(American_TV_series)', reddit: 'femalefashionadvice', query: 'euphoria fashion', news: 'Euphoria fashion' }
}
async function timed(url) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000)
  try { return await fetch(url, { headers: { 'User-Agent': 'AlohaAIConsulting/2.0 (public-signal-research)' }, signal: controller.signal }) }
  finally { clearTimeout(timer) }
}
function clean(value = '') { return value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() }
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }) }
  const cfg = CONFIG[req.query.moment]
  if (!cfg) return res.status(400).json({ error: 'Invalid moment' })
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=86400')
  const end = new Date(), start = new Date(Date.now() - 6 * 864e5), fmt = date => date.toISOString().slice(0, 10).replace(/-/g, '')
  const [w, r, n] = await Promise.allSettled([
    timed(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(cfg.wiki)}/daily/${fmt(start)}/${fmt(end)}`),
    timed(`https://www.reddit.com/r/${cfg.reddit}/search.json?q=${encodeURIComponent(cfg.query)}&restrict_sr=1&sort=relevance&t=week&limit=10`),
    timed(`https://news.google.com/rss/search?q=${encodeURIComponent(cfg.news)}&hl=en-US&gl=US&ceid=US:en`)
  ])
  let wiki = null, reddit = null, news = []
  try { if (w.status === 'fulfilled' && w.value.ok) { const data = await w.value.json(), items = data.items || []; wiki = { daily: Math.round(items.reduce((sum, item) => sum + (item.views || 0), 0) / (items.length || 1)), days: items.length } } } catch {}
  try { if (r.status === 'fulfilled' && r.value.ok) { const data = await r.value.json(), posts = data.data?.children || []; reddit = { postCount: posts.length, totalScore: posts.reduce((sum, post) => sum + (post.data?.score || 0), 0), subreddit: cfg.reddit } } } catch {}
  try {
    if (n.status === 'fulfilled' && n.value.ok) {
      const xml = await n.value.text()
      for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const block = match[1], title = clean(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]), link = clean(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]), source = clean(block.match(/<source.*?>([\s\S]*?)<\/source>/)?.[1]), date = clean(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1])
        if (title) news.push({ title, link, source, date })
      }
      news = news.slice(0, 5)
    }
  } catch {}
  return res.status(200).json({ moment: req.query.moment, wiki, reddit, news, fetchedAt: new Date().toISOString(), methodVersion: '2026-08-19' })
}

// /pages/api/signal.js
// Sources: Wikipedia pageview + Reddit JSON + Google News RSS + Google Trends (unofficial)
// Cache: Upstash Redis REST, 2hr TTL per culture moment

async function redisGet(key) {
  try {
    const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
    })
    const d = await r.json()
    return d.result ? JSON.parse(d.result) : null
  } catch { return null }
}

async function redisSet(key, value, ttl) {
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([JSON.stringify(value), 'EX', ttl])
    })
  } catch {}
}

const MOMENTS_CONFIG = {
  bridgerton: {
    label: 'Bridgerton universe',
    wikiArticle: 'Bridgerton',
    redditQuery: 'bridgerton fashion brand',
    redditSub: 'femalefashionadvice',
    newsQuery: 'Bridgerton brand partnership 2026',
    trendsKeyword: 'bridgerton fashion'
  },
  mj: {
    label: 'Michael Jackson biopic',
    wikiArticle: 'Michael_Jackson',
    redditQuery: 'michael jackson biopic style',
    redditSub: 'malefashionadvice',
    newsQuery: 'Michael Jackson biopic fashion trend 2026',
    trendsKeyword: 'michael jackson style 2026'
  },
  yellowstone: {
    label: 'Yellowstone / Dutton Ranch',
    wikiArticle: 'Yellowstone_(TV_series)',
    redditQuery: 'yellowstone fashion western aesthetic',
    redditSub: 'television',
    newsQuery: 'Dutton Ranch Yellowstone fashion tourism 2026',
    trendsKeyword: 'dutton ranch western aesthetic'
  },
  euphoria: {
    label: 'Euphoria S3 — Feral Glam',
    wikiArticle: 'Euphoria_(American_TV_series)',
    redditQuery: 'euphoria fashion maddy perez feral glam',
    redditSub: 'femalefashionadvice',
    newsQuery: 'Euphoria season 3 fashion feral glam 2026',
    trendsKeyword: 'feral glam euphoria'
  }
}

async function fetchWiki(article) {
  try {
    const end = new Date()
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'')
    const r = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${fmt(start)}/${fmt(end)}`,
      { headers: { 'User-Agent': 'AlohaAIConsulting/1.0' } }
    )
    if (!r.ok) return null
    const d = await r.json()
    const items = d.items || []
    const total = items.reduce((s, i) => s + (i.views || 0), 0)
    const daily = Math.round(total / (items.length || 1))
    // Compare to prior week for momentum
    const recent = items.slice(-3).reduce((s,i) => s+(i.views||0),0) / 3
    const earlier = items.slice(0,3).reduce((s,i) => s+(i.views||0),0) / 3
    const momentum = earlier > 0 ? Math.round(((recent - earlier) / earlier) * 100) : 0
    return { daily, total, momentum, days: items.length }
  } catch { return null }
}

async function fetchReddit(query, sub) {
  try {
    const r = await fetch(
      `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=hot&limit=10&t=week`,
      { headers: { 'User-Agent': 'AlohaAIConsulting/1.0' } }
    )
    if (!r.ok) return null
    const d = await r.json()
    const posts = d.data?.children || []
    return {
      postCount: posts.length,
      totalScore: posts.reduce((s, p) => s + (p.data?.score || 0), 0),
      topPost: posts[0]?.data?.title?.slice(0, 100)
    }
  } catch { return null }
}

async function fetchNews(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    const r = await fetch(url, { headers: { 'User-Agent': 'AlohaAIConsulting/1.0' } })
    if (!r.ok) return []
    const xml = await r.text()
    const items = []
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
    for (const m of matches) {
      const b = m[1]
      const title = b.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim()
      const source = b.match(/<source.*?>(.*?)<\/source>/)?.[1]?.trim()
      const date = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim()
      if (title) items.push({ title, source, date })
    }
    return items.slice(0, 5)
  } catch { return [] }
}

export default async function handler(req, res) {
  const { moment } = req.query
  if (!moment || !MOMENTS_CONFIG[moment]) {
    return res.status(400).json({ error: 'Invalid moment. Use: bridgerton, mj, yellowstone, euphoria' })
  }

  const cacheKey = `aloha:bil:${moment}:v2`
  const cached = await redisGet(cacheKey)
  if (cached) return res.status(200).json(cached)

  const cfg = MOMENTS_CONFIG[moment]
  const [wiki, reddit, news] = await Promise.allSettled([
    fetchWiki(cfg.wikiArticle),
    fetchReddit(cfg.redditQuery, cfg.redditSub),
    fetchNews(cfg.newsQuery)
  ])

  const payload = {
    moment,
    label: cfg.label,
    wiki: wiki.status === 'fulfilled' ? wiki.value : null,
    reddit: reddit.status === 'fulfilled' ? reddit.value : null,
    news: news.status === 'fulfilled' ? news.value : [],
    fetchedAt: new Date().toISOString()
  }

  await redisSet(cacheKey, payload, 60 * 60 * 2) // 2hr cache per moment
  return res.status(200).json(payload)
}

import Head from 'next/head'
const U='https://aloha-behavioral-intelligence.vercel.app'
export default function Sources(){return <><Head>
 <title>Sources & Method — Behavioral Intelligence Layer</title>
 <meta name="description" content="The exact query behind each attention sample — a seven-day Wikimedia pageviews window filtered to human traffic, one Reddit subreddit search, and five Google News RSS matches — with the known distortions of each."/>
 <meta name="robots" content="index, follow"/>
 <link rel="canonical" href={U+'/sources'}/>
 <meta property="og:title" content="Sources & method — Behavioral Intelligence Layer"/>
 <meta property="og:description" content="What each attention sample actually queries, what it can support, and how it is distorted."/>
 <meta property="og:type" content="article"/>
 <meta property="og:url" content={U+'/sources'}/>
 <meta property="og:image" content={U+'/og.png'}/>
 <meta property="og:image:width" content="1200"/>
 <meta property="og:image:height" content="630"/>
 <meta property="og:image:alt" content="Behavioral Intelligence Layer — screen culture to testable behavior hypotheses, using Wikipedia pageviews, a Reddit search sample and Google News RSS as attention samples."/>
 <meta name="twitter:card" content="summary_large_image"/>
 <meta name="twitter:image" content={U+'/og.png'}/>
</Head><main><a href="/">← Back</a><h1>Sources & method</h1>
<p className="lede">Last reviewed August 19, 2026. Next review September 19, 2026. Method version 2026-08-19, which is also stamped into every response the signal endpoint returns.</p>

<h2>The exact query behind each sample</h2>
<p>Naming a source is not the same as describing what was asked of it, so each query is written out here in full. A reader who wants to reproduce a number has everything needed to do it.</p>
<ul>
 <li><a href="https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews">Wikimedia Pageviews API</a>: daily pageviews for one English Wikipedia article across a seven-day window ending today, averaged. The request filters to the <strong>user</strong> agent class, so traffic Wikimedia identifies as automated is excluded before the average is taken. What remains is page requests — not unique people, sentiment, intent, or purchases.</li>
 <li><a href="https://www.reddit.com/dev/api/#GET_search">Reddit search JSON</a>: up to ten results for one fixed query, restricted to one named subreddit, sorted by relevance, limited to the past week. The subreddit is chosen per moment and is part of the configuration rather than something the page discovers, so the sample reflects that one community and the ranking Reddit returns at that moment.</li>
 <li><a href="https://news.google.com/rss">Google News RSS</a>: the first five items from the US English edition of the feed for a fixed query string. Feed composition changes with Google’s own ranking, and five matches indicate that coverage exists rather than how much exists.</li>
</ul>

<h2>How the samples are fetched</h2>
<p>All three requests are issued server-side, in parallel, each with a five-second timeout, and each is allowed to fail on its own. A source that times out or errors returns an em dash while the other two still display, which is why a partial result is normal rather than a sign of breakage. Responses are cached for two hours at the edge and may be served stale for up to a day while a fresh copy is fetched, so a number on this page can lag a live query by that much. Every response carries the timestamp at which it was actually fetched, shown beneath the metrics.</p>

<h2>Known distortions</h2>
<p>Each measure bends in a direction worth naming. Wikipedia pageviews spike on release dates, obituaries, and awards, which are attention events rather than consumer ones. A single subreddit is a community with its own demographics and moderation culture, and a topic can be busy there while absent everywhere else, or the reverse. Google News RSS reflects publisher output, so it measures how much the press decided to write, which responds to press offices as readily as to audiences. Read together the three disagree often, and the disagreement is more informative than any one of them alone.</p>

<h2>Interpretation</h2>
<p>The behavioral text accompanying each moment is an issue-spotting hypothesis informed by established concepts: associative learning, observational learning, narrative transportation, identity signaling, and place attachment. Those concepts are well supported in their own literatures. Applying them to one named title is an interpretive step this page makes explicit rather than hiding, because that step is where a plausible story can outrun its evidence.</p>
<p>Public-source attention signals are descriptive. They record that attention moved, and leave open why it moved and whether any consumer action followed. Settling either question takes audience research, conversion data, or a controlled study — which is the work this page is designed to scope rather than replace.</p>
</main></>}

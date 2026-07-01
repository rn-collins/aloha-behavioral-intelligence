// api/inquire.js
// Handles inquiry form submissions from any OK COOL / Laura suite tool.
// Fires Slack alert → stores to Upstash Redis.
//
// ENV VARS REQUIRED (already set per project in Vercel):
//   SLACK_WEBHOOK_URL         — fires to the project's dedicated channel
//   UPSTASH_REDIS_REST_URL    — shared Redis instance
//   UPSTASH_REDIS_REST_TOKEN  — shared Redis token

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, type, message, source } = req.body || {};

  if (!name || !email || !type) {
    return res.status(400).json({ error: 'name, email, and type are required' });
  }

  const ts = Date.now();
  const key = `inquiry:${source || 'unknown'}:${ts}`;
  const payload = { name, email, type, message: message || '', source: source || 'unknown', ts };

  // ── UPSTASH REDIS ─────────────────────────────────────────────────────────
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([JSON.stringify(payload)]),
    });
  } catch (e) {
    console.error('Redis error:', e);
  }

  // ── SLACK ─────────────────────────────────────────────────────────────────
  const typeLabels = {
    build: 'Build a tool',
    consulting: 'Consulting engagement',
    speaking: 'Speaking / panel',
    other: 'Something else',
  };

  const slackBody = {
    text: `📬 New inquiry from *${name}*`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📬 New Inquiry' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name*\n${name}` },
          { type: 'mrkdwn', text: `*Email*\n${email}` },
          { type: 'mrkdwn', text: `*Type*\n${typeLabels[type] || type}` },
          { type: 'mrkdwn', text: `*Source*\n${source || 'unknown'}` },
        ],
      },
      message ? {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Message*\n${message}` },
      } : null,
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: `Reply to ${name}` },
            url: `mailto:${email}?subject=Re: Your inquiry&body=Hi ${name},%0A%0A`,
            action_id: 'reply_email',
          },
        ],
      },
    ].filter(Boolean),
  };

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackBody),
    });
  } catch (e) {
    console.error('Slack error:', e);
  }

  return res.status(200).json({ ok: true });
}

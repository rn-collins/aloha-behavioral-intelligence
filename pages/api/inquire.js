// /pages/api/inquire.js
// Handles InquiryModal form submissions
// Stores to Upstash Redis, pings Slack #inquiries, sends Resend emails

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, type, message, source } = req.body
  if (!name || !email || !type) {
    return res.status(400).json({ error: 'Name, email, and inquiry type are required.' })
  }

  const timestamp = Date.now()

  // 1 — Store in Upstash Redis
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/contacts:${timestamp}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        JSON.stringify({ name, email, type, message, source, timestamp }),
        'EX',
        60 * 60 * 24 * 90,
      ]),
    })
  } catch (e) { console.error('Redis store failed:', e) }

  // 2 — Slack #inquiries alert
  try {
    await fetch(process.env.SLACK_INQUIRIES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New inquiry via ${source || 'unknown'}
Name: ${name}
Email: ${email}
Type: ${type}
Message: ${message || '(none)'}`,
      }),
    })
  } catch (e) { console.error('Slack ping failed:', e) }

  // 3 — Confirmation email to submitter
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RN Collins <onboarding@resend.dev>',
        to: email,
        subject: 'Got your message — RN Collins · Aloha AI Consulting',
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1C1B1F"><div style="font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#1B7A68;margin-bottom:16px">Aloha AI Consulting</div><h1 style="font-size:22px;font-weight:600;margin:0 0 16px">Hi ${name} — message received.</h1><p style="font-size:15px;line-height:1.7;color:#5A5857;margin:0 0 24px">Thanks for reaching out. I will review your message and be in touch within one business day.</p><p style="font-size:13px;color:#8A8784;margin:0">— RN Collins<br>Neuroscientist · JD Candidate, Northeastern · Founder, Aloha AI Consulting</p></div>`,
      }),
    })
  } catch (e) { console.error('Resend confirmation failed:', e) }

  // 4 — Notification email to RN
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Aloha AI Leads <onboarding@resend.dev>',
        to: process.env.RN_EMAIL,
        subject: `New ${type} inquiry from ${name}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1C1B1F"><div style="font-size:13px;font-weight:600;color:#1B7A68;margin-bottom:12px">New inquiry via ${source || 'unknown'}</div><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px 0;color:#5A5857;width:100px">Name</td><td style="padding:8px 0;font-weight:500">${name}</td></tr><tr><td style="padding:8px 0;color:#5A5857">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr><tr><td style="padding:8px 0;color:#5A5857">Type</td><td style="padding:8px 0">${type}</td></tr><tr><td style="padding:8px 0;color:#5A5857;vertical-align:top">Message</td><td style="padding:8px 0;line-height:1.6">${message || '(none)'}</td></tr></table></div>`,
      }),
    })
  } catch (e) { console.error('Resend notification failed:', e) }

  return res.status(200).json({ ok: true })
}

import { useState } from 'react';

// ── INQUIRY MODAL ─────────────────────────────────────────────────────────────
// Drop this component into any page. It renders a floating "Get in touch" button
// (bottom-right) that opens a slide-up modal with a full inquiry form.
//
// REQUIRES in the same project:
//   - api/inquire.js (included in this package)
//   - SLACK_WEBHOOK_URL env var set in Vercel (already set per project)
//   - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars (already set)
//
// USAGE:
//   import InquiryModal from '../components/InquiryModal';
//   // At the bottom of your page component, before the closing tag:
//   <InquiryModal source="third-asset" />
//
// SOURCE values (use the project slug):
//   third-asset | culture-monitor | governance-audit | behavioral-intel | creator-rights | encoding-effect

const INQUIRY_TYPES = [
  { value: '', label: 'What can I help with?' },
  { value: 'build', label: 'Build a tool' },
  { value: 'consulting', label: 'Consulting engagement' },
  { value: 'speaking', label: 'Speaking / panel' },
  { value: 'other', label: 'Something else' },
];

export default function InquiryModal({ source = 'unknown' }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.type) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source }),
      });
      if (!res.ok) throw new Error('Server error');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setForm({ name: '', email: '', type: '', message: '' });
      setStatus('idle');
    }, 300);
  };

  return (
    <>
      {/* ── FLOATING TRIGGER ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open inquiry form"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 900,
          background: '#1C1B1F',
          color: '#F6F3EC',
          border: 'none',
          borderRadius: '100px',
          padding: '12px 22px',
          fontFamily: '"Syne", sans-serif',
          fontWeight: 600,
          fontSize: '12px',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(28,27,31,0.18)',
          transition: 'background 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#B8842A'}
        onMouseLeave={e => e.currentTarget.style.background = '#1C1B1F'}
      >
        Get in touch
      </button>

      {/* ── OVERLAY ── */}
      <div
        onClick={reset}
        style={{
          display: open ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,27,31,0.35)',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* ── MODAL ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Inquiry form"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1001,
          background: '#F6F3EC',
          borderRadius: '16px 16px 0 0',
          padding: '36px 32px 40px',
          maxWidth: '540px',
          margin: '0 auto',
          boxShadow: '0 -8px 40px rgba(28,27,31,0.12)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '24px', fontWeight: 500, marginBottom: '12px', color: '#1C1B1F' }}>
              Got it.
            </div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', color: 'rgba(28,27,31,0.55)', marginBottom: '28px', lineHeight: 1.6 }}>
              I&apos;ll be in touch at <strong>{form.email}</strong> within one business day.
            </div>
            <button onClick={reset} style={btnStyle('#1C1B1F', '#F6F3EC')}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '22px', fontWeight: 500, color: '#1C1B1F', marginBottom: '4px' }}>
                  Let&apos;s talk.
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '12.5px', color: 'rgba(28,27,31,0.5)' }}>
                  RN Collins · collins.ra@northeastern.edu
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(28,27,31,0.4)', fontSize: '20px', lineHeight: 1, padding: '4px' }}
              >
                ×
              </button>
            </div>

            {/* Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="First name"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@domain.com"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Inquiry type */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>What can I help with?</label>
              <select
                value={form.type}
                onChange={update('type')}
                required
                style={{ ...inputStyle, color: form.type ? '#1C1B1F' : 'rgba(28,27,31,0.4)', cursor: 'pointer' }}
              >
                {INQUIRY_TYPES.map(t => (
                  <option key={t.value} value={t.value} disabled={!t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Context (optional)</label>
              <textarea
                value={form.message}
                onChange={update('message')}
                placeholder="Tell me what you&#39;re working on..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '76px' }}
              />
            </div>

            {/* Submit */}
            {status === 'error' && (
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '12px', color: '#C24A2E', marginBottom: '10px' }}>
                Something went wrong. Email me directly at collins.ra@northeastern.edu
              </div>
            )}
            <button
              type="submit"
              disabled={status === 'loading' || !form.name || !form.email || !form.type}
              style={{
                ...btnStyle('#1C1B1F', '#F6F3EC'),
                width: '100%',
                opacity: (!form.name || !form.email || !form.type) ? 0.45 : 1,
                cursor: (!form.name || !form.email || !form.type) ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? 'Sending…' : 'Send inquiry'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

// ── STYLE HELPERS ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontFamily: '"DM Mono", monospace',
  fontSize: '10px',
  fontWeight: 400,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(28,27,31,0.5)',
  marginBottom: '5px',
};

const inputStyle = {
  width: '100%',
  fontFamily: 'Manrope, sans-serif',
  fontSize: '13.5px',
  fontWeight: 400,
  color: '#1C1B1F',
  background: '#fff',
  border: '1px solid rgba(28,27,31,0.12)',
  borderRadius: '4px',
  padding: '9px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const btnStyle = (bg, fg) => ({
  fontFamily: '"Syne", sans-serif',
  fontWeight: 600,
  fontSize: '12px',
  letterSpacing: '0.05em',
  padding: '12px 24px',
  background: bg,
  color: fg,
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background 0.15s',
});

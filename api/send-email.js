export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = req.headers['x-push-secret'];
  if (!secret || secret !== process.env.PUSH_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { to, title, body, url } = req.body || {};
  if (!to || !title) {
    res.status(400).json({ error: 'Missing to or title' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email not configured' });
    return;
  }

  const from = process.env.EMAIL_FROM || 'Nexwork <notifications@nexwork.uz>';
  const linkUrl = url || 'https://nexwork.uz/';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;margin:0 0 12px">${escapeHtml(title)}</h2>
      ${body ? `<p style="color:#475569;line-height:1.6;margin:0 0 20px">${escapeHtml(body)}</p>` : ''}
      <a href="${linkUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">Открыть в Nexwork</a>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from, to, subject: title, html }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      res.status(resp.status).json({ error: errText });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

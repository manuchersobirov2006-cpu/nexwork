import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@nexwork.uz',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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

  const { subscription, title, body, url } = req.body || {};
  if (!subscription || !subscription.endpoint || !title) {
    res.status(400).json({ error: 'Missing subscription or title' });
    return;
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body: body || '', url: url || '/' })
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    // 410/404 means the subscription is dead (user uninstalled, cleared data, etc.)
    const expired = err.statusCode === 410 || err.statusCode === 404;
    res.status(expired ? 410 : 500).json({ error: err.message, expired });
  }
}

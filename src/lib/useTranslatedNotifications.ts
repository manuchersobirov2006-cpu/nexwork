import { useEffect, useState } from 'react';
import { useTheme } from './theme';
import { translateText } from './translate';
import type { Notification } from './types';

/**
 * Notification title/body are stored as plain text in whichever
 * language was active for whoever triggered the event — switching the
 * viewer's UI language doesn't retroactively translate them. This
 * translates each notification on the fly (client-side, cached per
 * id+language) whenever the viewer's language isn't Russian.
 */
export function useTranslatedNotifications(notifications: Notification[]) {
  const { language } = useTheme();
  const [translated, setTranslated] = useState<Record<string, { title: string; body: string | null }>>({});

  useEffect(() => {
    if (language === 'ru' || notifications.length === 0) {
      setTranslated({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(notifications.map(async n => {
        try {
          const [title, body] = await Promise.all([
            translateText(n.title, language),
            n.body ? translateText(n.body, language) : Promise.resolve(null),
          ]);
          return [n.id, { title, body }] as const;
        } catch {
          return [n.id, { title: n.title, body: n.body }] as const;
        }
      }));
      if (!cancelled) setTranslated(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [notifications, language]);

  return (n: Notification): { title: string; body: string | null } => translated[n.id] ?? { title: n.title, body: n.body };
}

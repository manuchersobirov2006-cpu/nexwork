import { t } from './i18n';

interface Rule {
  keywords: string[];
  replyKeys: string[];
}

const RULES: Rule[] = [
  { keywords: ['привет', 'здравств', 'добр', 'salom', 'hello', 'hi'], replyKeys: ['support.bot.greeting.1', 'support.bot.greeting.2', 'support.bot.greeting.3'] },
  { keywords: ['спасибо', 'благодар', 'rahmat', 'thanks', 'thank you'], replyKeys: ['support.bot.thanks.1', 'support.bot.thanks.2'] },
  { keywords: ['пока', 'до свидан', 'xayr', 'bye', 'goodbye'], replyKeys: ['support.bot.bye.1', 'support.bot.bye.2'] },
  { keywords: ['оплат', 'деньг', 'вывод', 'баланс', 'плат', "to'lov", 'pul', 'payment', 'money', 'withdraw'], replyKeys: ['support.bot.payment.1', 'support.bot.payment.2', 'support.bot.payment.3'] },
  { keywords: ['комисс', 'тариф', 'процент', 'fee', 'commission', 'narx'], replyKeys: ['support.bot.fees.1', 'support.bot.fees.2'] },
  { keywords: ['отмен', 'возврат', 'cancel', 'refund', 'bekor'], replyKeys: ['support.bot.cancel.1', 'support.bot.cancel.2'] },
  { keywords: ['верифика', 'паспорт', 'докумен', 'подтверд', 'tasdiq', 'verif'], replyKeys: ['support.bot.verification.1', 'support.bot.verification.2', 'support.bot.verification.3'] },
  { keywords: ['тендер', 'заявк', 'отклик', 'tender', 'taklif', 'bid'], replyKeys: ['support.bot.tender.1', 'support.bot.tender.2'] },
  { keywords: ['вакан', 'резюме', 'job', 'vakansiya', 'rezyume', 'resume'], replyKeys: ['support.bot.job.1', 'support.bot.job.2'] },
  { keywords: ['заказ', 'услуг', 'order', 'buyurtma', 'xizmat', 'gig'], replyKeys: ['support.bot.order.1', 'support.bot.order.2'] },
  { keywords: ['отзыв', 'рейтинг', 'review', 'rating', 'sharh'], replyKeys: ['support.bot.review.1', 'support.bot.review.2'] },
  { keywords: ['портфолио', 'portfolio'], replyKeys: ['support.bot.portfolio.1', 'support.bot.portfolio.2'] },
  { keywords: ['роль', 'фрилансер', 'заказчик', 'role', 'frilanser', 'switch'], replyKeys: ['support.bot.role.1', 'support.bot.role.2'] },
  { keywords: ['язык', 'til', 'language'], replyKeys: ['support.bot.language.1', 'support.bot.language.2'] },
  { keywords: ['аккаунт', 'парол', 'вход', 'логин', 'account', 'password', 'login', 'parol'], replyKeys: ['support.bot.account.1', 'support.bot.account.2'] },
  { keywords: ['спор', 'жалоб', 'обман', 'мошен', 'dispute', 'scam', 'shikoyat'], replyKeys: ['support.bot.dispute.1', 'support.bot.dispute.2'] },
];

const FALLBACK_KEYS = ['support.bot.fallback.1', 'support.bot.fallback.2', 'support.bot.fallback.3'];

function pickRandom(keys: string[]): string {
  return t(keys[Math.floor(Math.random() * keys.length)]);
}

export function getSupportBotReply(message: string): string {
  const lower = message.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return pickRandom(rule.replyKeys);
  }
  return pickRandom(FALLBACK_KEYS);
}

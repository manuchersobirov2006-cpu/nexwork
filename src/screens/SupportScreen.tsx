import { useState, useRef, useEffect } from 'react';
import { NEXWORK_TG, NEXWORK_PHONE } from '../lib/constants';
import { getSupportBotReply } from '../lib/supportBot';
import { t } from '../lib/i18n';
import { Send, Phone, Bot, User as UserIcon, LifeBuoy } from 'lucide-react';

interface BotMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
}

export function SupportScreen() {
  const [messages, setMessages] = useState<BotMessage[]>([
    { id: 'greeting', from: 'bot', text: t('support.bot.intro') },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: BotMessage = { id: crypto.randomUUID(), from: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = getSupportBotReply(text);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), from: 'bot', text: reply }]);
      setTyping(false);
    }, 500 + Math.random() * 400);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('support.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{t('support.subtitle')}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <a
          href={NEXWORK_TG}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Telegram</div>
            <div className="text-sm text-slate-500">@nexwork_uz</div>
          </div>
        </a>
        <a
          href={`tel:${NEXWORK_PHONE}`}
          className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{t('support.callUs')}</div>
            <div className="text-sm text-slate-500">{NEXWORK_PHONE}</div>
          </div>
        </a>
      </div>

      <div className="card overflow-hidden flex flex-col" style={{ height: '480px' }}>
        <div className="p-4 border-b border-slate-200 dark:border-[#232a3d] flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{t('support.chat.title')}</div>
            <div className="text-xs text-slate-500">{t('support.chat.subtitle')}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-slate-50 dark:bg-[#0a0e17]">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.from === 'bot' && (
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.from === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-[#161c2b] text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-[#232a3d]'
              }`}>
                {msg.text}
              </div>
              {msg.from === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-[#161c2b] border border-slate-200 dark:border-[#232a3d] flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-[#232a3d] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSend())}
            placeholder={t('support.chat.placeholder')}
            className="input flex-1"
          />
          <button onClick={handleSend} disabled={!input.trim()} className="btn-primary !p-2.5">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

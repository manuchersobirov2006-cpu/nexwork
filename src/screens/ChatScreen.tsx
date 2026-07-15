import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { timeAgo, formatDateTime } from '../lib/format';
import { Avatar, EmptyState, Spinner } from '../components/ui';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { acceptBid } from '../lib/bids';
import { formatPrice } from '../lib/format';
import type { Chat, Message, Profile, BidMessageMetadata, PortfolioItem } from '../lib/types';
import { Send, MessageSquare, Search, ArrowLeft, Paperclip, Smile, UserPlus, AlertCircle, Gavel, Check, Clock, Briefcase, ExternalLink } from 'lucide-react';

export function ChatScreen({ targetUserId }: { targetUserId?: string }) {
  const { profile } = useAuth();
  const { language } = useTheme();
  void language;
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [idError, setIdError] = useState<string | null>(null);
  const [idLoading, setIdLoading] = useState(false);
  const [bidStatuses, setBidStatuses] = useState<Record<string, string>>({});
  const [bidPortfolioById, setBidPortfolioById] = useState<Record<string, PortfolioItem>>({});
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadBidStatuses = useCallback(async (msgs: Message[]) => {
    const bidMsgs = msgs.filter(m => m.message_type === 'bid').map(m => m.metadata as BidMessageMetadata);
    const bidIds = Array.from(new Set(bidMsgs.map(m => m.bid_id)));
    if (bidIds.length > 0) {
      const { data } = await supabase.from('bids').select('id, status').in('id', bidIds);
      if (data) setBidStatuses(prev => ({ ...prev, ...Object.fromEntries(data.map(b => [b.id, b.status])) }));
    }
    const portfolioIds = Array.from(new Set(bidMsgs.flatMap(m => m.portfolio_item_ids || [])));
    if (portfolioIds.length > 0) {
      const { data } = await supabase.from('portfolio_items').select('*').in('id', portfolioIds);
      if (data) setBidPortfolioById(prev => ({ ...prev, ...Object.fromEntries((data as PortfolioItem[]).map(p => [p.id, p])) }));
    }
  }, []);

  const loadChats = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('chats')
      .select('*')
      .or(`participant_1.eq.${profile.id},participant_2.eq.${profile.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (data) {
      const chatsData = data as Chat[];
      const enriched = await Promise.all(
        chatsData.map(async (chat) => {
          const otherId = chat.participant_1 === profile.id ? chat.participant_2 : chat.participant_1;
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherId)
            .maybeSingle();
          return { ...chat, otherUser: otherUser as Profile };
        })
      );
      setChats(enriched);
    }
    setLoading(false);
  }, [profile]);

  // Auto-open chat with target user
  useEffect(() => {
    if (!targetUserId || !profile || chats.length === 0) return;
    const chat = chats.find(c => c.otherUser?.id === targetUserId);
    if (chat) setActiveChat(chat);
  }, [targetUserId, profile, chats]);

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data as Message[]);
      loadBidStatuses(data as Message[]);
    }
    setLoadingMessages(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [loadBidStatuses]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    if (activeChat) loadMessages(activeChat.id);
    else setMessages([]);
  }, [activeChat, loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!activeChat) return;
    const channel = supabase
      .channel(`messages:${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => [...prev, msg]);
          loadBidStatuses([msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, loadBidStatuses]);

  const handleSend = async () => {
    if (!profile || !activeChat || !newMessage.trim()) return;
    setSending(true);
    const msg = newMessage.trim();
    setNewMessage('');
    const { data } = await supabase.from('messages').insert({
      chat_id: activeChat.id,
      sender_id: profile.id,
      content: msg,
    }).select('*').single();
    if (data) {
      await supabase.from('chats').update({
        last_message: msg,
        last_message_at: new Date().toISOString(),
      }).eq('id', activeChat.id);
      const otherId = activeChat.participant_1 === profile.id ? activeChat.participant_2 : activeChat.participant_1;
      await supabase.from('notifications').insert({
        user_id: otherId,
        type: 'message',
        title: t('chat.newMessage'),
        body: msg.slice(0, 50),
        link: 'chat',
      });
      loadChats();
    }
    setSending(false);
  };

  const handleAcceptBid = async (meta: BidMessageMetadata) => {
    setAcceptingBidId(meta.bid_id);
    await acceptBid(
      { id: meta.bid_id, project_id: meta.project_id, freelancer_id: meta.freelancer_id },
      t('board.bidAccepted.title'),
      `${t('board.bidAccepted.body')} "${meta.project_title}"`
    );
    setBidStatuses(prev => ({ ...prev, [meta.bid_id]: 'accepted' }));
    setAcceptingBidId(null);
  };

  const startChatById = async () => {
    if (!profile || !idInput.trim()) return;
    setIdError(null);
    setIdLoading(true);
    const lookupId = idInput.trim().toUpperCase();

    // Look up user by public_id
    const { data: targetUser, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('public_id', lookupId)
      .maybeSingle();

    if (lookupError || !targetUser) {
      setIdError(t('chat.byId.notFound'));
      setIdLoading(false);
      return;
    }

    const target = targetUser as Profile;

    // Can't chat with yourself
    if (target.id === profile.id) {
      setIdError(t('chat.byId.self'));
      setIdLoading(false);
      return;
    }

    // Check for existing chat
    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant_1.eq.${profile.id},participant_2.eq.${target.id}),and(participant_1.eq.${target.id},participant_2.eq.${profile.id})`)
      .maybeSingle();

    let chatId = existing?.id;

    if (!chatId) {
      const { data: newChat } = await supabase.from('chats').insert({
        participant_1: profile.id,
        participant_2: target.id,
      }).select('id').single();
      chatId = newChat?.id;
    }

    setIdLoading(false);
    setShowNewChat(false);
    setIdInput('');

    // Reload chats and open the new one
    if (chatId) {
      await loadChats();
      const { data: chatData } = await supabase
        .from('chats')
        .select('*, otherUser:profiles!chats_participant_2_fkey(*)')
        .eq('id', chatId)
        .maybeSingle();
      if (chatData) {
        const otherId = chatData.participant_1 === profile.id ? chatData.participant_2 : chatData.participant_1;
        const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
        setActiveChat({ ...chatData, otherUser: otherUser as Profile } as Chat);
      }
    }
  };

  const filteredChats = chats.filter(c =>
    c.otherUser && (c.otherUser.display_name || c.otherUser.full_name || c.otherUser.email).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8 text-brand-600" /></div>;
  }

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      {/* Chat list */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{t('chat.title')}</h1>
            <button onClick={() => setShowNewChat(true)} className="btn-ghost !p-1.5" title={t('chat.writeById')}>
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('chat.searchChats')} className="input-sm input pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredChats.length === 0 ? (
            <EmptyState icon={MessageSquare} title={t('chat.noChats.title')} description={t('chat.noChats.description')} />
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left border-b border-slate-100 dark:border-slate-800/50 ${
                  activeChat?.id === chat.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar src={chat.otherUser?.avatar_url ?? undefined} name={chat.otherUser?.display_name || chat.otherUser?.email} size={44} />
                  {chat.otherUser?.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-white dark:border-slate-900" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{chat.otherUser?.display_name || chat.otherUser?.full_name}</span>
                    {chat.last_message_at && <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(chat.last_message_at)}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{chat.last_message || t('chat.noMessages')}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {activeChat ? (
          <>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <button onClick={() => setActiveChat(null)} className="btn-ghost md:hidden !p-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar src={activeChat.otherUser?.avatar_url ?? undefined} name={activeChat.otherUser?.display_name || activeChat.otherUser?.email} size={40} />
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{activeChat.otherUser?.display_name || activeChat.otherUser?.full_name}</div>
                <div className="text-xs text-slate-500">{activeChat.otherUser?.is_online ? t('chat.online') : `${t('chat.wasOnline')} ${timeAgo(activeChat.otherUser?.last_seen || '')}`}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
              {loadingMessages ? (
                <div className="flex justify-center"><Spinner className="w-6 h-6 text-brand-600" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm">{t('chat.startConversation')}</div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_id === profile?.id;

                  if (msg.message_type === 'bid') {
                    const meta = msg.metadata as BidMessageMetadata;
                    const status = bidStatuses[meta.bid_id];
                    const canAccept = profile?.id === meta.employer_id && status === 'pending';
                    const sender = isOwn ? profile : activeChat.otherUser;
                    const attached = (meta.portfolio_item_ids || []).map(id => bidPortfolioById[id]).filter(Boolean);
                    return (
                      <div key={msg.id} className="flex justify-center animate-fade-in">
                        <div className="w-full card p-5 border-brand-200 dark:border-brand-800">
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <Avatar src={sender?.avatar_url ?? undefined} name={sender?.display_name || sender?.email} size={40} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{sender?.display_name || sender?.full_name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1"><Gavel className="w-3 h-3" /> {t('board.newBid.title')}</div>
                            </div>
                            <div className="text-[11px] text-slate-400 shrink-0">{formatDateTime(msg.created_at)}</div>
                          </div>

                          <div className="text-base font-bold text-slate-900 dark:text-white mb-3">{meta.project_title}</div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                              <div className="text-xs text-slate-500 mb-0.5">{t('board.yourPrice')}</div>
                              <div className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(meta.bid_amount)}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                              <div className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{t('board.duration')}</div>
                              <div className="font-bold text-slate-900 dark:text-white">{meta.delivery_days} {t('board.days')}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                              <div className="text-xs text-slate-500 mb-0.5">{t('companies.status')}</div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {status === 'accepted' ? t('board.accepted') : status === 'rejected' ? t('companies.status.rejected') : t('companies.status.pending')}
                              </div>
                            </div>
                          </div>

                          {meta.message && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-500 mb-1">{t('board.coverLetter')}</div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">{meta.message}</p>
                            </div>
                          )}

                          {attached.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {t('portfolio.attached')}</div>
                              <div className="flex gap-2 flex-wrap">
                                {attached.map(p => (
                                  <a
                                    key={p.id}
                                    href={p.link_url || undefined}
                                    target={p.link_url ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="w-20"
                                    title={p.title}
                                  >
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                                      {p.image_urls[0] ? (
                                        <img src={p.image_urls[0]} alt={p.title} className="w-full h-full object-cover" />
                                      ) : (
                                        <Briefcase className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                      )}
                                      {p.link_url && <ExternalLink className="w-3.5 h-3.5 text-white absolute bottom-1 right-1 drop-shadow" />}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.title}</div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {status === 'accepted' ? (
                            <span className="badge bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 gap-1"><Check className="w-3.5 h-3.5" /> {t('board.accepted')}</span>
                          ) : status === 'rejected' ? (
                            <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t('companies.status.rejected')}</span>
                          ) : canAccept ? (
                            <button
                              onClick={() => handleAcceptBid(meta)}
                              disabled={acceptingBidId === meta.bid_id}
                              className="btn-primary !py-2 text-sm w-full sm:w-auto"
                            >
                              {acceptingBidId === meta.bid_id ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              {t('board.accept')}
                            </button>
                          ) : (
                            <span className="badge bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">{t('companies.status.pending')}</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`text-[10px] mt-1 ${isOwn ? 'text-brand-200' : 'text-slate-400'}`}>
                          {formatDateTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <button className="btn-ghost !p-2" disabled><Paperclip className="w-5 h-5" /></button>
                <button className="btn-ghost !p-2" disabled><Smile className="w-5 h-5" /></button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={t('chat.messagePlaceholder')}
                  className="input flex-1"
                />
                <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="btn-primary !p-2.5">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={MessageSquare} title={t('chat.selectChat.title')} description={t('chat.selectChat.description')} />
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowNewChat(false); setIdError(null); setIdInput(''); }}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md card p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('chat.byId.title')}</h2>
            <p className="text-sm text-slate-500 mb-4">{t('chat.byId.description')}</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={idInput}
                onChange={e => { setIdInput(e.target.value.toUpperCase()); setIdError(null); }}
                onKeyDown={e => e.key === 'Enter' && startChatById()}
                placeholder={t('chat.byId.placeholder')}
                className="input font-mono"
                autoFocus
              />
              <button onClick={startChatById} disabled={idLoading || !idInput.trim()} className="btn-primary shrink-0">
                {idLoading ? <Spinner className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {t('chat.byId.button')}
              </button>
            </div>
            {idError && (
              <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {idError}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <span>{t('chat.byId.yourId')}</span>
              <code className="font-mono font-semibold text-brand-600 dark:text-brand-400">{profile?.public_id}</code>
            </div>
            <button onClick={() => { setShowNewChat(false); setIdError(null); setIdInput(''); }} className="btn-secondary w-full mt-4">{t('chat.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { timeAgo, formatDateTime } from '../lib/format';
import { Avatar, EmptyState, Spinner } from '../components/ui';
import type { Chat, Message, Profile } from '../lib/types';
import { Send, MessageSquare, Search, ArrowLeft, Paperclip, Smile, UserPlus, AlertCircle } from 'lucide-react';

export function ChatScreen({ targetUserId }: { targetUserId?: string }) {
  const { profile } = useAuth();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (data) setMessages(data as Message[]);
    setLoadingMessages(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

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
          setMessages(prev => [...prev, payload.new as Message]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat]);

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
        title: 'Новое сообщение',
        body: msg.slice(0, 50),
        link: 'chat',
      });
      loadChats();
    }
    setSending(false);
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
      setIdError('Пользователь с таким ID не найден');
      setIdLoading(false);
      return;
    }

    const target = targetUser as Profile;

    // Can't chat with yourself
    if (target.id === profile.id) {
      setIdError('Нельзя начать чат с самим собой');
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
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Сообщения</h1>
            <button onClick={() => setShowNewChat(true)} className="btn-ghost !p-1.5" title="Написать по ID">
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск чатов..." className="input-sm input pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredChats.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Нет чатов" description="Начните общение с продавцом услуги" />
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
                  <p className="text-xs text-slate-500 truncate">{chat.last_message || 'Нет сообщений'}</p>
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
                <div className="text-xs text-slate-500">{activeChat.otherUser?.is_online ? 'В сети' : `был(а) ${timeAgo(activeChat.otherUser?.last_seen || '')}`}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
              {loadingMessages ? (
                <div className="flex justify-center"><Spinner className="w-6 h-6 text-brand-600" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm">Начните разговор. Отправьте первое сообщение!</div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_id === profile?.id;
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
                  placeholder="Напишите сообщение..."
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
            <EmptyState icon={MessageSquare} title="Выберите чат" description="Выберите беседу из списка слева" />
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowNewChat(false); setIdError(null); setIdInput(''); }}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md card p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Написать по ID</h2>
            <p className="text-sm text-slate-500 mb-4">Введите ID пользователя, чтобы начать чат. ID можно найти в профиле.</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={idInput}
                onChange={e => { setIdInput(e.target.value.toUpperCase()); setIdError(null); }}
                onKeyDown={e => e.key === 'Enter' && startChatById()}
                placeholder="Например: A1B2C3D4"
                className="input font-mono"
                autoFocus
              />
              <button onClick={startChatById} disabled={idLoading || !idInput.trim()} className="btn-primary shrink-0">
                {idLoading ? <Spinner className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                Чат
              </button>
            </div>
            {idError && (
              <div className="px-3 py-2 bg-error-50 dark:bg-error-900/20 text-error-700 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {idError}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <span>Ваш ID:</span>
              <code className="font-mono font-semibold text-brand-600 dark:text-brand-400">{profile?.public_id}</code>
            </div>
            <button onClick={() => { setShowNewChat(false); setIdError(null); setIdInput(''); }} className="btn-secondary w-full mt-4">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

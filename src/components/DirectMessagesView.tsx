import React, { useState } from 'react';
import {
  Search,
  Clock,
  Send,
  Trash2,
  MessageSquarePlus,
  ShieldCheck,
  Bot,
  AtSign,
  Sparkles,
} from 'lucide-react';
import { DMConversation, DirectMessageItem, UserProfile } from '../types';
import { CONSTELLATION_AVATARS } from '../data/seedData';
import { soundAndPush } from '../utils/soundAndPush';
import {
  HighlightedMentionText,
  MentionAutocompleteBar,
} from '../utils/mentionText';

interface DirectMessagesViewProps {
  conversations: DMConversation[];
  messagesByPartner: Record<string, DirectMessageItem[]>;
  activePartnerUid: string;
  onSelectPartner: (uid: string) => void;
  onSendMessage: (partnerUid: string, text: string) => void;
  onDeleteMessage: (partnerUid: string, msgId: string) => void;
  onCycleDisappearTimer: (partnerUid: string) => void;
  onStartNewConversation: (user: {
    uid: string;
    name: string;
    photo: string;
    color: string;
  }) => void;
  currentUser: UserProfile;
  isNovaStreaming?: boolean;
  onMentionClick?: (username: string) => void;
}

const NOVA_QUICK_PROMPTS = [
  'Keep me company while no one is around—what are we vibing to tonight?',
  'Give me a late-night creative prompt for a new Vibe post.',
  'Suggest 3 cool custom roles and permissions for my Channel Space.',
  'Tell me a short atmospheric story about a midnight synth studio.',
];

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  conversations,
  messagesByPartner,
  activePartnerUid,
  onSelectPartner,
  onSendMessage,
  onDeleteMessage,
  onCycleDisappearTimer,
  onStartNewConversation,
  currentUser,
  isNovaStreaming = false,
  onMentionClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const activeConv =
    conversations.find((c) => c.otherUid === activePartnerUid) || conversations[0];
  const currentMessages = activeConv
    ? messagesByPartner[activeConv.otherUid] || []
    : [];

  const isNovaChat = activeConv?.otherUid === 'ai_nova';

  const filteredConversations = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;
    onSendMessage(activeConv.otherUid, input.trim());
    setInput('');
    soundAndPush.playEffect('send');
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex min-h-[calc(100vh-5rem)]">
      <div className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Inbox List (4 Cols) */}
        <div className="md:col-span-4 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-[#0f0f17]">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Direct Messages
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSelectPartner('ai_nova')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors"
                  title="Chat with @NovaAI Companion"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>@NovaAI</span>
                </button>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>New DM</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-[#171723] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/5">
            {filteredConversations.map((conv) => {
              const isSelected = conv.otherUid === activeConv?.otherUid;
              const isAI = conv.otherUid === 'ai_nova';
              return (
                <button
                  key={conv.otherUid}
                  onClick={() => onSelectPartner(conv.otherUid)}
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-purple-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <img
                    src={conv.otherPhoto}
                    alt={conv.otherName}
                    referrerPolicy="no-referrer"
                    className={`w-10 h-10 rounded-full object-cover shrink-0 ${
                      isAI ? 'ring-2 ring-purple-500/60' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: conv.otherColor }}
                        >
                          {conv.otherName}
                        </span>
                        {isAI && (
                          <span className="text-[10px] font-semibold text-purple-400">
                            · AI
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {conv.lastMessageAt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{conv.otherStatus}</span>
                      {conv.disappearHours > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 font-mono">
                            Timer: {conv.disappearHours}h
                          </span>
                        </>
                      )}
                      {conv.unread && (
                        <>
                          <span>·</span>
                          <span className="text-purple-400 font-semibold">Unread</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Chat Window (8 Cols) */}
        <div className="md:col-span-8 flex flex-col bg-white dark:bg-[#12121a]">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={activeConv.otherPhoto}
                    alt={activeConv.otherName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-display font-bold text-sm truncate"
                        style={{ color: activeConv.otherColor }}
                      >
                        @{activeConv.otherName}
                      </h3>
                      {isNovaChat && (
                        <span className="text-xs font-medium text-purple-400">
                          · Real-Time AI Companion
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {activeConv.otherStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onCycleDisappearTimer(activeConv.otherUid)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeConv.disappearHours > 0
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Cycle Disappearing Messages Timer (Off / 12h / 24h / 48h)"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Timer:{' '}
                      {activeConv.disappearHours > 0
                        ? `${activeConv.disappearHours}h`
                        : 'Off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Privacy or AI Companion Banner */}
              <div className="px-5 py-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                {isNovaChat ? (
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      @NovaAI is your real-time AI companion—always awake when no one else is around. You can also mention @NovaAI in any Channel Space or Vibe post!
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Direct messages comply with strict privacy isolation. Mention any user with @handle to notify them.
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Starter Prompts for @NovaAI */}
              {isNovaChat && (
                <div className="px-5 py-2.5 border-b border-slate-200/70 dark:border-white/5 bg-purple-500/[0.03] flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-semibold text-purple-400 shrink-0">
                    Quick Vibes:
                  </span>
                  {NOVA_QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isNovaStreaming}
                      onClick={() => {
                        onSendMessage('ai_nova', prompt);
                        soundAndPush.playEffect('send');
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-white dark:bg-[#191926] border border-purple-500/20 text-slate-700 dark:text-slate-300 hover:border-purple-500/50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {currentMessages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No messages yet. Say hello to @{activeConv.otherName}!
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    const isMine =
                      msg.senderId === currentUser.uid ||
                      msg.senderId === 'current_user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`group relative max-w-lg px-4 py-2.5 rounded-2xl text-sm space-y-1 ${
                            isMine
                              ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white'
                              : msg.senderId === 'ai_nova'
                              ? 'bg-purple-500/10 border border-purple-500/30 text-slate-900 dark:text-slate-100'
                              : 'bg-slate-100 dark:bg-[#1b1b28] text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="leading-relaxed break-words whitespace-pre-line">
                            <HighlightedMentionText
                              text={msg.text}
                              currentUsername={currentUser.displayName}
                              onMentionClick={onMentionClick}
                              invertedBubble={isMine}
                            />
                          </p>
                          <div className="flex items-center justify-end gap-2 text-[10px] opacity-75 font-mono">
                            <span>{msg.createdAt}</span>
                            {isMine && (
                              <button
                                onClick={() =>
                                  onDeleteMessage(activeConv.otherUid, msg.id)
                                }
                                className="opacity-0 group-hover:opacity-100 hover:text-rose-200 transition-opacity"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {isNovaChat && isNovaStreaming && (
                  <div className="flex items-center gap-2 text-xs text-purple-400 font-medium px-2">
                    <Bot className="w-4 h-4" />
                    <span>@NovaAI is streaming a response...</span>
                  </div>
                )}
              </div>

              {/* Message Input Bar + @Mention Autocomplete */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-200 dark:border-white/10 space-y-2"
              >
                <MentionAutocompleteBar
                  inputValue={input}
                  onSelectUsername={(nextText) => setInput(nextText)}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        (prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`
                      )
                    }
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181824] text-slate-500 hover:text-purple-400 transition-colors"
                    title="Insert @mention"
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isNovaChat
                        ? 'Chat live with @NovaAI... Ask anything or share what is on your mind'
                        : `Message @${activeConv.otherName} (type @ to mention users)...`
                    }
                    maxLength={2000}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isNovaChat && isNovaStreaming}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>

      {/* Modal: Start New DM */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newUsernameInput.trim()) return;
              const name = newUsernameInput.trim();
              onStartNewConversation({
                uid: `u_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                name,
                photo:
                  CONSTELLATION_AVATARS[
                    Math.floor(Math.random() * CONSTELLATION_AVATARS.length)
                  ].url,
                color: '#c084fc',
              });
              setNewUsernameInput('');
              setShowNewChatModal(false);
            }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#12121c] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Start Direct Message
            </h3>
            <input
              type="text"
              required
              value={newUsernameInput}
              onChange={(e) => setNewUsernameInput(e.target.value)}
              placeholder="Enter username (e.g. NovaAI, AriaVibes, KaelSynth)"
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white"
              >
                Open Chat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Flame,
  Compass,
  Bot,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  auth,
  db,
  fetchLegacyVibes,
  handleFirestoreError,
  isAuthorizedOwnerEmail,
  OperationType,
} from './firebase';
import {
  AppNotification,
  ChannelSpace,
  CustomNotificationRule,
  DMConversation,
  DirectMessageItem,
  PlatformRole,
  SpaceMessage,
  UserProfile,
  VibePost,
} from './types';
import {
  INITIAL_CHANNEL_SPACES,
  INITIAL_CUSTOM_RULES,
  INITIAL_DIRECT_MESSAGES,
  INITIAL_DM_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SPACE_MESSAGES,
  INITIAL_VIBE_POSTS,
  LEADERBOARD_USERS,
} from './data/seedData';
import { soundAndPush } from './utils/soundAndPush';
import { extractMentions, KNOWN_MENTION_USERS } from './utils/mentionText';
import { streamNovaResponse } from './utils/aiClient';
import { GlobalFeedView } from './components/GlobalFeedView';
import { ChannelSpacesView } from './components/ChannelSpacesView';
import { DirectMessagesView } from './components/DirectMessagesView';
import { NotificationsAndRulesView } from './components/NotificationsAndRulesView';
import { LeaderboardsAndProfileView } from './components/LeaderboardsAndProfileView';
import { AdminAndAuthModal } from './components/AdminAndAuthModal';

type ActiveSection = 'feed' | 'spaces' | 'messages' | 'notifications' | 'profile';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('feed');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('vs_dark_mode') !== 'light';
  });
  const [soundOn, setSoundOn] = useState<boolean>(soundAndPush.soundEnabled);

  // User Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('vs_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback below
      }
    }
    return {
      uid: 'operator_vibecartel',
      displayName: 'VibeSpacesOfficial',
      email: 'co.vibecartel@gmail.com',
      photoURL: '/Spaces.png',
      bio: 'Founder & Community Architect at VibeSpaces · A quieter corner of the internet.',
      mood: '✨ Building the future',
      activityStatus: 'Overseeing Vibe Cartel HQ',
      profileTheme: 'default',
      isPrivate: false,
      streakCount: Number(localStorage.getItem('vs_streak') || 14),
      role: 'owner',
      interests: ['Music', 'Technology', 'Design', 'Coding', 'Space'],
      badges: ['Platform Founder', 'Space Architect', '14-Day Streak'],
      createdAt: '2026-01-01',
    };
  });

  // Core Platform Data State
  const [vibes, setVibes] = useState<VibePost[]>(INITIAL_VIBE_POSTS);
  const [savedVibeIds, setSavedVibeIds] = useState<string[]>(['vibe_music_card_1']);
  const [spaces, setSpaces] = useState<ChannelSpace[]>(INITIAL_CHANNEL_SPACES);
  const [activeSpaceId, setActiveSpaceId] = useState<string>(
    INITIAL_CHANNEL_SPACES[0].id
  );
  const [spaceMessages, setSpaceMessages] = useState<SpaceMessage[]>(
    INITIAL_SPACE_MESSAGES
  );
  const [dmConversations, setDmConversations] = useState<DMConversation[]>(
    INITIAL_DM_CONVERSATIONS
  );
  const [directMessages, setDirectMessages] = useState<
    Record<string, DirectMessageItem[]>
  >(INITIAL_DIRECT_MESSAGES);
  const [activeDmPartnerUid, setActiveDmPartnerUid] = useState<string>('ai_nova');
  const [customRules, setCustomRules] = useState<CustomNotificationRule[]>(
    INITIAL_CUSTOM_RULES
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(
    INITIAL_NOTIFICATIONS
  );
  const [allUsers, setAllUsers] = useState<UserProfile[]>(LEADERBOARD_USERS);

  // Real-Time @NovaAI Streaming States
  const [isNovaStreamingDM, setIsNovaStreamingDM] = useState<boolean>(false);
  const [isNovaTypingInSpace, setIsNovaTypingInSpace] = useState<boolean>(false);

  // Admin & Auth Modal State
  const [modalMode, setModalMode] = useState<'auth' | 'admin' | null>(null);
  const [adminPin, setAdminPin] = useState<string>(
    () => localStorage.getItem('vs_admin_pin') || '2026'
  );
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  // Sync Dark Mode & Profile Theme with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('vs_dark_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('vs_dark_mode', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-profile-theme',
      currentUser.profileTheme
    );
    localStorage.setItem('vs_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Load legacy vibes from vibespaces-web-82a77 + attach Auth & Firestore listeners
  useEffect(() => {
    let mounted = true;
    fetchLegacyVibes().then((legacyList) => {
      if (!mounted || legacyList.length === 0) return;
      setVibes((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueLegacy = legacyList.filter((l) => !existingIds.has(l.id));
        return [...prev, ...uniqueLegacy];
      });
    });

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) return;
      setCurrentUser((prev) => ({
        ...prev,
        uid: fbUser.uid,
        displayName: fbUser.displayName || prev.displayName,
        email: fbUser.email || prev.email,
        photoURL: fbUser.photoURL || prev.photoURL,
        role: isAuthorizedOwnerEmail(fbUser.email) ? 'owner' : prev.role,
      }));
    });

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  // Attach Firestore real-time listener when Firebase Auth user is signed in
  useEffect(() => {
    if (!auth.currentUser) return;
    const vibesPath = 'vibes';
    const q = query(collection(db, vibesPath), orderBy('createdAt', 'desc'), limit(25));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) return;
        const cloudPosts: VibePost[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || 'Untitled'),
            content: String(data.content || ''),
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Viber'),
            authorPhoto: String(data.authorPhoto || '/Spaces.png'),
            authorColor: String(data.authorColor || '#c084fc'),
            isOperator: Boolean(data.isOperator),
            anonymous: Boolean(data.anonymous),
            pinned: Boolean(data.pinned),
            category: String(data.category || 'General'),
            mediaUrl: data.mediaUrl ? String(data.mediaUrl) : undefined,
            mediaType: data.mediaType || 'none',
            reactions: {
              heart: [],
              fire: [],
              laugh: [],
              cry: [],
            },
            comments: [],
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
            source: 'cloud',
          };
        });
        setVibes((prev) => {
          const cloudIds = new Set(cloudPosts.map((c) => c.id));
          return [...cloudPosts, ...prev.filter((p) => !cloudIds.has(p.id))];
        });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, vibesPath);
        } catch {
          // Handled and logged via handleFirestoreError
        }
      }
    );

    return () => unsub();
  }, []);

  // Helper to evaluate custom rules and append a real-time notification
  const dispatchRealtimeNotification = (
    title: string,
    body: string,
    sourceName: string,
    type: AppNotification['type'] = 'system',
    spaceName?: string
  ) => {
    const { notification, triggeredRuleId } =
      soundAndPush.evaluateRulesAndDispatch(
        {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type,
          title,
          body,
          sourceName,
          spaceName,
          read: false,
          createdAt: 'Just now',
        },
        customRules
      );

    if (triggeredRuleId) {
      setCustomRules((prev) =>
        prev.map((r) =>
          r.id === triggeredRuleId
            ? { ...r, triggeredCount: r.triggeredCount + 1 }
            : r
        )
      );
    }

    if (notification.priority !== 'muted') {
      setNotifications((prev) => [notification, ...prev]);
    }
  };

  // Detect @mentions in text and trigger a dedicated 'mention' notification for each mentioned user
  const processMentionsAndNotify = (
    text: string,
    contextLabel: string,
    spaceName?: string
  ): string[] => {
    const handles = extractMentions(text);
    for (const handle of handles) {
      dispatchRealtimeNotification(
        `@${handle} was mentioned by @${currentUser.displayName} in ${contextLabel}`,
        `"${text.slice(0, 140)}"`,
        currentUser.displayName,
        'mention',
        spaceName
      );
    }
    return handles;
  };

  // Clicking a highlighted @mention opens DM with that user or @NovaAI
  const handleMentionClick = (username: string) => {
    const clean = username.replace(/^@/, '');
    if (clean.toLowerCase() === 'novaai') {
      setActiveDmPartnerUid('ai_nova');
      setActiveSection('messages');
      soundAndPush.playEffect('pop');
      return;
    }
    const known = KNOWN_MENTION_USERS.find(
      (u) => u.displayName.toLowerCase() === clean.toLowerCase()
    );
    handleStartNewConversation({
      uid: known?.uid || `u_${clean.toLowerCase()}`,
      name: known?.displayName || clean,
      photo:
        known?.photoURL ||
        `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(clean)}`,
      color: known?.color || '#38bdf8',
    });
  };

  // Feed Handlers
  const handleCreateVibe = async (
    newVibeData: Omit<VibePost, 'id' | 'createdAt' | 'reactions' | 'comments'>
  ) => {
    const newId = `vibe_${Date.now()}`;
    const created: VibePost = {
      ...newVibeData,
      id: newId,
      reactions: { heart: [], fire: [], laugh: [], cry: [] },
      comments: [],
      createdAt: new Date().toISOString(),
      source: 'cloud',
    };
    setVibes((prev) => [created, ...prev]);

    // Check for @mentions in the Vibe content and trigger notifications
    const mentionedHandles = processMentionsAndNotify(
      `${created.title} ${created.content}`,
      'Global Vibe Post'
    );

    // If @NovaAI was mentioned in the Vibe post, have @NovaAI reply with a real-time comment!
    if (mentionedHandles.some((h) => h.toLowerCase() === 'novaai')) {
      const commentId = `c_nova_${Date.now()}`;
      setVibes((prev) =>
        prev.map((v) =>
          v.id === newId
            ? {
                ...v,
                comments: [
                  ...v.comments,
                  {
                    id: commentId,
                    authorId: 'ai_nova',
                    authorName: 'NovaAI',
                    authorPhoto:
                      'https://api.dicebear.com/9.x/shapes/svg?seed=NovaAI&backgroundColor=3b0764',
                    text: 'Thinking...',
                    createdAt: 'Live AI',
                  },
                ],
              }
            : v
        )
      );

      streamNovaResponse({
        message: `User @${created.authorName} just published a Vibe titled "${created.title}": "${created.content}" and mentioned @NovaAI. Write a warm, concise comment replying to their Vibe (mention @${created.authorName}).`,
        userName: created.authorName,
        onChunk: (partial) => {
          setVibes((prev) =>
            prev.map((v) =>
              v.id === newId
                ? {
                    ...v,
                    comments: v.comments.map((c) =>
                      c.id === commentId ? { ...c, text: partial } : c
                    ),
                  }
                : v
            )
          );
        },
      });
    }

    // Increment daily streak
    const nextStreak = currentUser.streakCount + 1;
    localStorage.setItem('vs_streak', String(nextStreak));
    setCurrentUser((prev) => ({ ...prev, streakCount: nextStreak }));

    // Sync to Firestore if signed in with verified email
    if (auth.currentUser?.emailVerified) {
      const path = `vibes/${newId}`;
      try {
        await setDoc(doc(db, 'vibes', newId), {
          title: created.title.slice(0, 120),
          content: created.content.slice(0, 2000),
          authorId: auth.currentUser.uid,
          authorName: created.authorName.slice(0, 60),
          authorPhoto: created.authorPhoto.slice(0, 500),
          authorColor: created.authorColor.slice(0, 40),
          isOperator: Boolean(created.isOperator),
          anonymous: Boolean(created.anonymous),
          pinned: false,
          category: created.category.slice(0, 40),
          mediaUrl: (created.mediaUrl || '').slice(0, 600),
          mediaType: created.mediaType || 'none',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, path);
        } catch {
          // Logged by handleFirestoreError
        }
      }
    }
  };

  const handleReactVibe = (
    vibeId: string,
    reactionKey: keyof VibePost['reactions']
  ) => {
    soundAndPush.playEffect('pop');
    setVibes((prev) =>
      prev.map((v) => {
        if (v.id !== vibeId) return v;
        const list = v.reactions[reactionKey] || [];
        const exists = list.includes(currentUser.uid);
        const nextList = exists
          ? list.filter((id) => id !== currentUser.uid)
          : [...list, currentUser.uid];
        return {
          ...v,
          reactions: {
            ...v.reactions,
            [reactionKey]: nextList,
          },
        };
      })
    );
  };

  const handleVotePoll = (vibeId: string, optionIdx: number) => {
    soundAndPush.playEffect('pop');
    setVibes((prev) =>
      prev.map((v) => {
        if (v.id !== vibeId || !v.poll) return v;
        const nextOptions = v.poll.options.map((opt, idx) => {
          const withoutMe = opt.votes.filter((u) => u !== currentUser.uid);
          if (idx === optionIdx) {
            const alreadyVoted = opt.votes.includes(currentUser.uid);
            return {
              ...opt,
              votes: alreadyVoted ? withoutMe : [...withoutMe, currentUser.uid],
            };
          }
          return { ...opt, votes: withoutMe };
        });
        return {
          ...v,
          poll: { ...v.poll, options: nextOptions },
        };
      })
    );
  };

  const handleCommentVibe = (vibeId: string, text: string) => {
    soundAndPush.playEffect('send');
    const targetVibe = vibes.find((v) => v.id === vibeId);
    setVibes((prev) =>
      prev.map((v) => {
        if (v.id !== vibeId) return v;
        return {
          ...v,
          comments: [
            ...v.comments,
            {
              id: `c_${Date.now()}`,
              authorId: currentUser.uid,
              authorName: currentUser.displayName,
              authorPhoto: currentUser.photoURL,
              text,
              createdAt: 'Just now',
            },
          ],
        };
      })
    );

    const mentionedHandles = processMentionsAndNotify(
      text,
      `Comment on "${targetVibe?.title || 'Vibe'}"`
    );

    if (mentionedHandles.some((h) => h.toLowerCase() === 'novaai')) {
      const novaCommentId = `c_nova_${Date.now() + 1}`;
      setVibes((prev) =>
        prev.map((v) =>
          v.id === vibeId
            ? {
                ...v,
                comments: [
                  ...v.comments,
                  {
                    id: novaCommentId,
                    authorId: 'ai_nova',
                    authorName: 'NovaAI',
                    authorPhoto:
                      'https://api.dicebear.com/9.x/shapes/svg?seed=NovaAI&backgroundColor=3b0764',
                    text: '...',
                    createdAt: 'Live AI',
                  },
                ],
              }
            : v
        )
      );

      streamNovaResponse({
        message: text,
        userName: currentUser.displayName,
        onChunk: (partial) => {
          setVibes((prev) =>
            prev.map((v) =>
              v.id === vibeId
                ? {
                    ...v,
                    comments: v.comments.map((c) =>
                      c.id === novaCommentId ? { ...c, text: partial } : c
                    ),
                  }
                : v
            )
          );
        },
      });
    }
  };

  const handleToggleSaveVibe = (vibeId: string) => {
    soundAndPush.playEffect('pop');
    setSavedVibeIds((prev) =>
      prev.includes(vibeId) ? prev.filter((id) => id !== vibeId) : [...prev, vibeId]
    );
  };

  const handleTogglePinVibe = (vibeId: string) => {
    soundAndPush.playEffect('pin');
    setVibes((prev) =>
      prev.map((v) => (v.id === vibeId ? { ...v, pinned: !v.pinned } : v))
    );
  };

  const handleDeleteVibe = async (vibeId: string) => {
    setVibes((prev) => prev.filter((v) => v.id !== vibeId));
    if (auth.currentUser?.emailVerified) {
      try {
        await deleteDoc(doc(db, 'vibes', vibeId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `vibes/${vibeId}`);
        } catch {
          // Handled
        }
      }
    }
  };

  // Channel Space Handlers
  const handleSendSpaceMessage = (
    msgData: Omit<SpaceMessage, 'id' | 'createdAt'>
  ) => {
    const created: SpaceMessage = {
      ...msgData,
      id: `smsg_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSpaceMessages((prev) => [...prev, created]);

    const targetSpace = spaces.find((s) => s.id === msgData.spaceId);
    const targetChannel = targetSpace?.channels.find(
      (c) => c.id === msgData.channelId
    );

    // Check for @mentions in the Channel Space message
    const mentionedHandles = processMentionsAndNotify(
      msgData.content,
      `#${targetChannel?.name || 'channel'}`,
      targetSpace?.name
    );

    // Boost organic Vibe XP for the Channel Space
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id !== msgData.spaceId) return s;
        const nextXP = s.vibeXP + 25;
        const nextLevel = nextXP >= 1200 ? 3 : nextXP >= 600 ? 2 : 1;
        return { ...s, vibeXP: nextXP, level: nextLevel };
      })
    );

    // If @NovaAI was mentioned in the Channel Space, stream a live response from @NovaAI in the channel!
    if (mentionedHandles.some((h) => h.toLowerCase() === 'novaai')) {
      const novaMsgId = `smsg_nova_${Date.now() + 1}`;
      const recentChannelHistory = spaceMessages
        .filter(
          (m) => m.spaceId === msgData.spaceId && m.channelId === msgData.channelId
        )
        .slice(-6)
        .map((m) => ({
          role: (m.authorId === 'ai_nova' ? 'model' : 'user') as 'user' | 'model',
          senderName: m.authorName,
          text: m.content,
        }));

      setIsNovaTypingInSpace(true);
      setSpaceMessages((prev) => [
        ...prev,
        {
          id: novaMsgId,
          spaceId: msgData.spaceId,
          channelId: msgData.channelId,
          authorId: 'ai_nova',
          authorName: 'NovaAI',
          authorPhoto:
            'https://api.dicebear.com/9.x/shapes/svg?seed=NovaAI&backgroundColor=3b0764',
          authorRoleName: 'AI Companion',
          authorRoleColor: '#c084fc',
          content: '...',
          replyTo: {
            id: created.id,
            authorName: created.authorName,
            snippet: created.content.slice(0, 60),
          },
          pinned: false,
          reactions: {},
          createdAt: new Date().toISOString(),
        },
      ]);

      streamNovaResponse({
        message: msgData.content,
        history: recentChannelHistory,
        activeSpaceName: targetSpace?.name,
        channelName: targetChannel?.name,
        userName: currentUser.displayName,
        onChunk: (partial) => {
          setSpaceMessages((prev) =>
            prev.map((m) =>
              m.id === novaMsgId
                ? {
                    ...m,
                    content: partial.startsWith(`@${currentUser.displayName}`)
                      ? partial
                      : `@${currentUser.displayName} ${partial}`,
                  }
                : m
            )
          );
        },
      }).finally(() => {
        setIsNovaTypingInSpace(false);
        soundAndPush.playEffect('notify');
      });
    }
  };

  const handleTogglePinSpaceMessage = (msgId: string) => {
    soundAndPush.playEffect('pin');
    setSpaceMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const handleDeleteSpaceMessage = (msgId: string) => {
    setSpaceMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const handleReactSpaceMessage = (msgId: string, emoji: string) => {
    soundAndPush.playEffect('pop');
    setSpaceMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existingUids = m.reactions[emoji] || [];
        const hasReacted = existingUids.includes(currentUser.uid);
        const nextUids = hasReacted
          ? existingUids.filter((id) => id !== currentUser.uid)
          : [...existingUids, currentUser.uid];
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: nextUids,
          },
        };
      })
    );
  };

  const handleAddForumReply = (msgId: string, replyText: string) => {
    const parentThread = spaceMessages.find((m) => m.id === msgId);
    const parentSpace = spaces.find((s) => s.id === parentThread?.spaceId);

    setSpaceMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          threadReplies: [
            ...(m.threadReplies || []),
            {
              id: `tr_${Date.now()}`,
              authorName: currentUser.displayName,
              authorPhoto: currentUser.photoURL,
              authorRoleColor: '#c084fc',
              text: replyText,
              createdAt: 'Just now',
            },
          ],
        };
      })
    );

    processMentionsAndNotify(
      replyText,
      `Forum Thread "${parentThread?.title || 'Discussion'}"`,
      parentSpace?.name
    );
  };

  // Direct Message Handlers (including Real-Time Streaming Chat with @NovaAI)
  const handleSendDirectMessage = (partnerUid: string, text: string) => {
    const newMsg: DirectMessageItem = {
      id: `dm_${Date.now()}`,
      chatId: `chat_${partnerUid}`,
      senderId: currentUser.uid,
      recipientId: partnerUid,
      senderName: currentUser.displayName,
      text,
      createdAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const existingHistory = directMessages[partnerUid] || [];

    setDirectMessages((prev) => ({
      ...prev,
      [partnerUid]: [...(prev[partnerUid] || []), newMsg],
    }));

    setDmConversations((prev) =>
      prev.map((c) =>
        c.otherUid === partnerUid
          ? {
              ...c,
              lastMessage: text,
              lastMessageAt: 'Just now',
              unread: false,
            }
          : c
      )
    );

    // Trigger @mention notifications if any @username was tagged in the DM
    const partnerConv = dmConversations.find((c) => c.otherUid === partnerUid);
    processMentionsAndNotify(
      text,
      `Direct Message with @${partnerConv?.otherName || 'User'}`
    );

    // If chatting with @NovaAI (or if @NovaAI was mentioned inside any DM), stream a real-time AI response!
    if (
      partnerUid === 'ai_nova' ||
      text.toLowerCase().includes('@novaai')
    ) {
      const targetUid = partnerUid === 'ai_nova' ? 'ai_nova' : partnerUid;
      const aiMsgId = `dm_nova_${Date.now() + 1}`;
      const historyPayload = existingHistory.slice(-8).map((m) => ({
        role: (m.senderId === 'ai_nova' ? 'model' : 'user') as 'user' | 'model',
        senderName: m.senderName,
        text: m.text,
      }));

      setIsNovaStreamingDM(true);
      setDirectMessages((prev) => ({
        ...prev,
        [targetUid]: [
          ...(prev[targetUid] || []),
          {
            id: aiMsgId,
            chatId: `chat_${targetUid}`,
            senderId: 'ai_nova',
            recipientId: currentUser.uid,
            senderName: 'NovaAI',
            text: '...',
            createdAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ],
      }));

      streamNovaResponse({
        message: text,
        history: historyPayload,
        userName: currentUser.displayName,
        onChunk: (partial) => {
          setDirectMessages((prev) => ({
            ...prev,
            [targetUid]: (prev[targetUid] || []).map((m) =>
              m.id === aiMsgId ? { ...m, text: partial } : m
            ),
          }));
          setDmConversations((prev) =>
            prev.map((c) =>
              c.otherUid === targetUid
                ? {
                    ...c,
                    lastMessage: partial.slice(0, 90),
                    lastMessageAt: 'Live',
                  }
                : c
            )
          );
        },
      }).finally(() => {
        setIsNovaStreamingDM(false);
        soundAndPush.playEffect('notify');
      });
    }
  };

  const handleDeleteDirectMessage = (partnerUid: string, msgId: string) => {
    setDirectMessages((prev) => ({
      ...prev,
      [partnerUid]: (prev[partnerUid] || []).filter((m) => m.id !== msgId),
    }));
  };

  const handleCycleDisappearTimer = (partnerUid: string) => {
    const cycle: (0 | 12 | 24 | 48)[] = [0, 12, 24, 48];
    setDmConversations((prev) =>
      prev.map((c) => {
        if (c.otherUid !== partnerUid) return c;
        const nextIdx = (cycle.indexOf(c.disappearHours) + 1) % cycle.length;
        return { ...c, disappearHours: cycle[nextIdx] };
      })
    );
    soundAndPush.playEffect('pop');
  };

  const handleStartNewConversation = (partner: {
    uid: string;
    name: string;
    photo: string;
    color: string;
  }) => {
    setDmConversations((prev) => {
      if (prev.some((c) => c.otherUid === partner.uid)) return prev;
      return [
        {
          otherUid: partner.uid,
          otherName: partner.name,
          otherPhoto: partner.photo,
          otherColor: partner.color,
          otherStatus: 'Online in VibeSpaces',
          lastMessage: 'Conversation started',
          lastMessageAt: 'Just now',
          unread: false,
          disappearHours: 0,
        },
        ...prev,
      ];
    });
    setActiveDmPartnerUid(partner.uid);
    setActiveSection('messages');
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#08080d] dark:text-[#f0f0f5] transition-colors">
      {/* Mandatory 3-Zone Top Bar Contract */}
      <header className="h-16 px-6 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0b0b12]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#feed"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('feed');
          }}
          className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent whitespace-nowrap shrink-0"
        >
          VibeSpaces
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400 overflow-x-auto">
          {(
            [
              { id: 'feed', label: 'Social Feed' },
              { id: 'spaces', label: 'Channel Spaces' },
              { id: 'messages', label: 'Messages & @NovaAI' },
              {
                id: 'notifications',
                label:
                  unreadNotifCount > 0
                    ? `Notifications (${unreadNotifCount})`
                    : 'Notifications',
              },
              { id: 'profile', label: 'Profile & Streaks' },
            ] as const
          ).map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  soundAndPush.playEffect('pop');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'border-purple-500 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setModalMode('admin')}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-sky-600 rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
          >
            {isAdminUnlocked ? 'Admin Console' : 'Admin & Sign In'}
          </button>
        </div>
      </header>

      {/* Secondary Workspace Utility Bar (Below Top Bar Contract) */}
      <div className="px-6 py-2.5 border-b border-slate-200/80 dark:border-white/5 bg-slate-100/60 dark:bg-[#0d0d15] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveSection('spaces')}
            className="inline-flex items-center gap-1.5 hover:text-purple-400 transition-colors font-medium whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>
              Active Space:{' '}
              <strong className="text-slate-900 dark:text-white">
                {spaces.find((s) => s.id === activeSpaceId)?.name || 'Vibe Cartel HQ'}
              </strong>
            </span>
          </button>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums inline-flex items-center gap-1 text-amber-500 dark:text-amber-400">
            <Flame className="w-3.5 h-3.5" />
            <span>{currentUser.streakCount}d Streak</span>
          </span>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => {
              setActiveDmPartnerUid('ai_nova');
              setActiveSection('messages');
              soundAndPush.playEffect('pop');
            }}
            className="inline-flex items-center gap-1 text-purple-400 hover:underline font-medium whitespace-nowrap"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chat with @NovaAI Companion</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalMode('auth')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-purple-500/40 transition-colors whitespace-nowrap"
          >
            Switch Account / Admin PIN Login
          </button>

          <button
            onClick={() => {
              const next = soundAndPush.toggleSound();
              setSoundOn(next);
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-purple-400 transition-colors"
            title={soundOn ? 'Mute UI & Ambient Sounds' : 'Enable Sounds'}
          >
            {soundOn ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-purple-400 transition-colors whitespace-nowrap"
            title="Toggle Dark / Light Mode"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Dynamic Viewport */}
      <main className="flex-1 flex flex-col">
        {activeSection === 'feed' && (
          <GlobalFeedView
            vibes={vibes}
            savedVibeIds={savedVibeIds}
            onCreateVibe={handleCreateVibe}
            onReactVibe={handleReactVibe}
            onVotePoll={handleVotePoll}
            onCommentVibe={handleCommentVibe}
            onToggleSaveVibe={handleToggleSaveVibe}
            onTogglePinVibe={handleTogglePinVibe}
            onDeleteVibe={handleDeleteVibe}
            currentUser={currentUser}
            spaces={spaces}
            onNavigateToSpace={(spaceId) => {
              setActiveSpaceId(spaceId);
              setActiveSection('spaces');
            }}
            onOpenProfileModal={() => setActiveSection('profile')}
            onMentionClick={handleMentionClick}
            onOpenNovaChat={() => {
              setActiveDmPartnerUid('ai_nova');
              setActiveSection('messages');
              soundAndPush.playEffect('pop');
            }}
          />
        )}

        {activeSection === 'spaces' && (
          <ChannelSpacesView
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSelectSpace={setActiveSpaceId}
            onCreateSpace={(newSpace) => {
              setSpaces((prev) => [...prev, newSpace]);
              setActiveSpaceId(newSpace.id);
              dispatchRealtimeNotification(
                `New Channel Space Created: ${newSpace.name}`,
                `Invite code ${newSpace.inviteCode} is ready to share with your community.`,
                currentUser.displayName,
                'space_invite',
                newSpace.name
              );
            }}
            onUpdateSpace={(updated) => {
              setSpaces((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s))
              );
            }}
            messages={spaceMessages}
            onSendMessage={handleSendSpaceMessage}
            onTogglePinMessage={handleTogglePinSpaceMessage}
            onDeleteMessage={handleDeleteSpaceMessage}
            onReactMessage={handleReactSpaceMessage}
            onAddForumReply={handleAddForumReply}
            currentUser={currentUser}
            onOpenDMWithUser={(uid, name, photo, color) =>
              handleStartNewConversation({ uid, name, photo, color })
            }
            onMentionClick={handleMentionClick}
            isNovaTypingInSpace={isNovaTypingInSpace}
          />
        )}

        {activeSection === 'messages' && (
          <DirectMessagesView
            conversations={dmConversations}
            messagesByPartner={directMessages}
            activePartnerUid={activeDmPartnerUid}
            onSelectPartner={(uid) => {
              setActiveDmPartnerUid(uid);
              setDmConversations((prev) =>
                prev.map((c) =>
                  c.otherUid === uid ? { ...c, unread: false } : c
                )
              );
            }}
            onSendMessage={handleSendDirectMessage}
            onDeleteMessage={handleDeleteDirectMessage}
            onCycleDisappearTimer={handleCycleDisappearTimer}
            onStartNewConversation={handleStartNewConversation}
            currentUser={currentUser}
            isNovaStreaming={isNovaStreamingDM}
            onMentionClick={handleMentionClick}
          />
        )}

        {activeSection === 'notifications' && (
          <NotificationsAndRulesView
            notifications={notifications}
            rules={customRules}
            onCreateRule={(ruleData) => {
              const created: CustomNotificationRule = {
                ...ruleData,
                id: `rule_${Date.now()}`,
                triggeredCount: 0,
                createdAt: new Date().toISOString().slice(0, 10),
              };
              setCustomRules((prev) => [created, ...prev]);
            }}
            onToggleRule={(ruleId) => {
              setCustomRules((prev) =>
                prev.map((r) =>
                  r.id === ruleId ? { ...r, enabled: !r.enabled } : r
                )
              );
            }}
            onDeleteRule={(ruleId) => {
              setCustomRules((prev) => prev.filter((r) => r.id !== ruleId));
            }}
            onMarkAllRead={() => {
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true }))
              );
            }}
            onTriggerTestNotification={(title, body, spaceName) =>
              dispatchRealtimeNotification(
                title,
                body,
                currentUser.displayName,
                'system',
                spaceName
              )
            }
            currentUser={currentUser}
          />
        )}

        {activeSection === 'profile' && (
          <LeaderboardsAndProfileView
            currentUser={currentUser}
            onUpdateProfile={(updates) =>
              setCurrentUser((prev) => ({ ...prev, ...updates }))
            }
            spaces={spaces}
            onNavigateToSpace={(spaceId) => {
              setActiveSpaceId(spaceId);
              setActiveSection('spaces');
            }}
          />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="px-6 py-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          Developed & distributed by <strong>Vibe Cartel .Inc</strong> · VibeSpaces Web Platform
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveDmPartnerUid('ai_nova');
              setActiveSection('messages');
            }}
            className="hover:text-slate-900 dark:hover:text-white"
          >
            @NovaAI Companion
          </button>
          <button
            onClick={() => setActiveSection('spaces')}
            className="hover:text-slate-900 dark:hover:text-white"
          >
            Channel Spaces
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className="hover:text-slate-900 dark:hover:text-white"
          >
            Custom Filter Rules
          </button>
          <button
            onClick={() => setModalMode('admin')}
            className="hover:text-slate-900 dark:hover:text-white"
          >
            Owner & Admin Gate
          </button>
        </div>
      </footer>

      {/* Admin Console & Auth Modal */}
      {modalMode && (
        <AdminAndAuthModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          currentUser={currentUser}
          isAdminUnlocked={isAdminUnlocked}
          adminPin={adminPin}
          onUnlockAdmin={(attempt) => {
            if (attempt === adminPin) {
              setIsAdminUnlocked(true);
              return true;
            }
            return false;
          }}
          onResetAdminPin={(nextPin) => {
            setAdminPin(nextPin);
            localStorage.setItem('vs_admin_pin', nextPin);
            setIsAdminUnlocked(true);
          }}
          onSignInSuccess={(profileUpdates, unlockedAdmin) => {
            setCurrentUser((prev) => ({ ...prev, ...profileUpdates }));
            if (unlockedAdmin) {
              setIsAdminUnlocked(true);
            }
          }}
          vibes={vibes}
          onDeleteVibe={handleDeleteVibe}
          spaces={spaces}
          onDeleteSpace={(spaceId) =>
            setSpaces((prev) => prev.filter((s) => s.id !== spaceId))
          }
          onBroadcastSystemAlert={(title, body) => {
            handleCreateVibe({
              title,
              content: body,
              authorId: currentUser.uid,
              authorName: 'VibeSpacesOfficial',
              authorPhoto: '/Spaces.png',
              authorColor: '#c084fc',
              isOperator: true,
              anonymous: false,
              pinned: true,
              category: 'Announcements',
              mediaType: 'none',
            });
            dispatchRealtimeNotification(
              `Announcement: ${title}`,
              body,
              'VibeSpacesOfficial',
              'system',
              'Vibe Cartel HQ'
            );
          }}
          allUsers={allUsers}
          onUpdateUserPlatformRole={(uid, nextRole: PlatformRole) => {
            setAllUsers((prev) =>
              prev.map((u) => (u.uid === uid ? { ...u, role: nextRole } : u))
            );
            if (uid === currentUser.uid) {
              setCurrentUser((prev) => ({ ...prev, role: nextRole }));
            }
          }}
        />
      )}
    </div>
  );
}

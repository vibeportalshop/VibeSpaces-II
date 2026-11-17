import React, { useState } from 'react';
import {
  Hash,
  Megaphone,
  MessageSquare,
  Palette,
  Volume2,
  Plus,
  Pin,
  Shield,
  Crown,
  Sparkles,
  Reply,
  Trash2,
  Users,
  Copy,
  Check,
  Mic,
  MicOff,
  Hand,
  Radio,
  Lock,
  Calendar,
  ChevronRight,
  Sliders,
  AlertTriangle,
  ThumbsUp,
  AtSign,
  Bot,
} from 'lucide-react';
import {
  ChannelSpace,
  SpaceChannel,
  SpaceChannelType,
  SpaceMessage,
  SpaceRole,
  UserProfile,
} from '../types';
import { soundAndPush } from '../utils/soundAndPush';
import {
  HighlightedMentionText,
  MentionAutocompleteBar,
} from '../utils/mentionText';

interface ChannelSpacesViewProps {
  spaces: ChannelSpace[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: (newSpace: ChannelSpace) => void;
  onUpdateSpace: (updatedSpace: ChannelSpace) => void;
  messages: SpaceMessage[];
  onSendMessage: (msg: Omit<SpaceMessage, 'id' | 'createdAt'>) => void;
  onTogglePinMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onReactMessage: (msgId: string, emoji: string) => void;
  onAddForumReply: (msgId: string, replyText: string) => void;
  currentUser: UserProfile;
  onOpenDMWithUser: (uid: string, name: string, photo: string, color: string) => void;
  onMentionClick?: (username: string) => void;
  isNovaTypingInSpace?: boolean;
}

export const ChannelSpacesView: React.FC<ChannelSpacesViewProps> = ({
  spaces,
  activeSpaceId,
  onSelectSpace,
  onCreateSpace,
  onUpdateSpace,
  messages,
  onSendMessage,
  onTogglePinMessage,
  onDeleteMessage,
  onReactMessage,
  onAddForumReply,
  currentUser,
  onOpenDMWithUser,
  onMentionClick,
  isNovaTypingInSpace = false,
}) => {
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];
  const [activeChannelId, setActiveChannelId] = useState<string>(
    activeSpace?.channels[0]?.id || 'ch_general'
  );
  const [messageInput, setMessageInput] = useState('');
  const [forumTitleInput, setForumTitleInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
    snippet: string;
  } | null>(null);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Modals
  const [showRoleStudio, setShowRoleStudio] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);

  // New Channel State
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('Text Channels');
  const [newChannelType, setNewChannelType] = useState<SpaceChannelType>('text');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelSlowmode, setNewChannelSlowmode] = useState(0);

  // New Role State in Role Studio
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#38bdf8');
  const [editingRoleId, setEditingRoleId] = useState<string>(
    activeSpace?.roles[0]?.id || ''
  );
  const [newBlockedKeyword, setNewBlockedKeyword] = useState('');

  // New Space State
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [newSpacePublic, setNewSpacePublic] = useState(true);

  // Forum Thread Replies
  const [forumReplyInputs, setForumReplyInputs] = useState<Record<string, string>>({});

  // Live Voice Stage State
  const [inVoiceStage, setInVoiceStage] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [ambientPreset, setAmbientPreset] = useState<'off' | 'lofi' | 'rain' | 'cosmic'>('off');

  const currentChannel =
    activeSpace?.channels.find((c) => c.id === activeChannelId) ||
    activeSpace?.channels[0];

  // Determine current user's roles & permissions inside this Channel Space
  const currentMemberRecord = activeSpace?.members.find(
    (m) => m.uid === currentUser.uid
  );
  const isSpaceOwner =
    activeSpace?.ownerId === currentUser.uid ||
    currentUser.role === 'owner' ||
    currentUser.role === 'admin';

  const userSpaceRoles: SpaceRole[] = (activeSpace?.roles || [])
    .filter((r) =>
      isSpaceOwner
        ? r.position === 100 || currentMemberRecord?.roleIds.includes(r.id)
        : currentMemberRecord?.roleIds.includes(r.id)
    )
    .sort((a, b) => b.position - a.position);

  const highestUserRole: SpaceRole = userSpaceRoles[0] ||
    activeSpace?.roles[activeSpace.roles.length - 1] || {
      id: 'default',
      name: isSpaceOwner ? 'Space Founder' : 'Viber',
      color: isSpaceOwner ? '#c084fc' : '#94a3b8',
      badge: 'User',
      position: 10,
      permissions: {
        manageSpace: isSpaceOwner,
        manageChannels: isSpaceOwner,
        manageRoles: isSpaceOwner,
        moderateMembers: isSpaceOwner,
        pinMessages: isSpaceOwner,
        sendMedia: true,
        bypassSlowmode: isSpaceOwner,
      },
    };

  const hasPerm = (perm: keyof SpaceRole['permissions']): boolean => {
    if (isSpaceOwner) return true;
    return userSpaceRoles.some((r) => r.permissions[perm]);
  };

  const channelMessages = messages.filter(
    (m) => m.spaceId === activeSpace?.id && m.channelId === currentChannel?.id
  );
  const pinnedMessages = channelMessages.filter((m) => m.pinned);

  const [autoModWarning, setAutoModWarning] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !activeSpace || !currentChannel) return;

    // Check Space AutoMod blocked keywords
    const lower = trimmed.toLowerCase();
    const hitKeyword = activeSpace.blockedKeywords.find((kw) =>
      lower.includes(kw.toLowerCase())
    );
    if (hitKeyword && !hasPerm('moderateMembers')) {
      setAutoModWarning(
        `Message blocked by Channel Space AutoMod (restricted keyword: "${hitKeyword}").`
      );
      return;
    }
    setAutoModWarning(null);

    onSendMessage({
      spaceId: activeSpace.id,
      channelId: currentChannel.id,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorPhoto: currentUser.photoURL,
      authorRoleName: highestUserRole.name,
      authorRoleColor: highestUserRole.color,
      content: trimmed,
      title:
        currentChannel.type === 'forum' || currentChannel.type === 'moodboard'
          ? forumTitleInput.trim() || 'Untitled Entry'
          : undefined,
      mediaUrl: showMediaInput && mediaUrlInput.trim() ? mediaUrlInput.trim() : undefined,
      palette:
        currentChannel.type === 'moodboard'
          ? ['#08080d', highestUserRole.color, '#60a5fa', '#f59e0b']
          : undefined,
      replyTo: replyingTo || undefined,
      pinned: false,
      upvotes: [currentUser.uid],
      reactions: {},
      threadReplies: [],
    });

    setMessageInput('');
    setForumTitleInput('');
    setMediaUrlInput('');
    setShowMediaInput(false);
    setReplyingTo(null);
    soundAndPush.playEffect('send');
  };

  const handleCopyInvite = () => {
    if (!activeSpace) return;
    navigator.clipboard?.writeText(activeSpace.inviteCode).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeSpace) return;
    const cleanName = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    const created: SpaceChannel = {
      id: `ch_${Date.now()}`,
      name: cleanName,
      category: newChannelCategory,
      type: newChannelType,
      topic: newChannelTopic.trim() || `Welcome to #${cleanName}`,
      slowmodeSeconds: newChannelSlowmode,
    };
    const updated: ChannelSpace = {
      ...activeSpace,
      channels: [...activeSpace.channels, created],
    };
    onUpdateSpace(updated);
    setActiveChannelId(created.id);
    setNewChannelName('');
    setNewChannelTopic('');
    setShowCreateChannel(false);
    soundAndPush.playEffect('pop');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !activeSpace) return;
    const newRole: SpaceRole = {
      id: `role_${Date.now()}`,
      name: newRoleName.trim(),
      color: newRoleColor,
      badge: 'Sparkles',
      position: 45,
      permissions: {
        manageSpace: false,
        manageChannels: false,
        manageRoles: false,
        moderateMembers: false,
        pinMessages: true,
        sendMedia: true,
        bypassSlowmode: true,
      },
    };
    const updated: ChannelSpace = {
      ...activeSpace,
      roles: [...activeSpace.roles, newRole].sort((a, b) => b.position - a.position),
    };
    onUpdateSpace(updated);
    setEditingRoleId(newRole.id);
    setNewRoleName('');
    soundAndPush.playEffect('pop');
  };

  const handleToggleRolePermission = (
    roleId: string,
    permKey: keyof SpaceRole['permissions']
  ) => {
    if (!activeSpace) return;
    const updatedRoles = activeSpace.roles.map((r) => {
      if (r.id !== roleId) return r;
      return {
        ...r,
        permissions: {
          ...r.permissions,
          [permKey]: !r.permissions[permKey],
        },
      };
    });
    onUpdateSpace({ ...activeSpace, roles: updatedRoles });
  };

  const handleToggleMemberRole = (memberUid: string, roleId: string) => {
    if (!activeSpace || !hasPerm('manageRoles')) return;
    const existsInMembers = activeSpace.members.some((m) => m.uid === memberUid);
    let updatedMembers = activeSpace.members.map((m) => {
      if (m.uid !== memberUid) return m;
      const hasRole = m.roleIds.includes(roleId);
      const nextRoleIds = hasRole
        ? m.roleIds.filter((id) => id !== roleId)
        : [...m.roleIds, roleId];
      return { ...m, roleIds: nextRoleIds };
    });

    if (!existsInMembers && memberUid === currentUser.uid) {
      updatedMembers = [
        ...updatedMembers,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          activityStatus: currentUser.activityStatus,
          online: true,
          roleIds: [roleId],
          joinedAt: new Date().toISOString().slice(0, 10),
        },
      ];
    }

    onUpdateSpace({ ...activeSpace, members: updatedMembers });
    soundAndPush.playEffect('pop');
  };

  const handleCreateNewSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    const code = `${newSpaceName
      .trim()
      .slice(0, 4)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'V')}-${Math.floor(100 + Math.random() * 900)}`;
    const createdSpace: ChannelSpace = {
      id: `space_${Date.now()}`,
      name: newSpaceName.trim(),
      description:
        newSpaceDesc.trim() ||
        'A community Channel Space with custom roles, forums, and live lounges.',
      icon: currentUser.photoURL || '/Spaces.png',
      banner: '/src/assets/images/cosmic_lounge_banner_1793960031308.jpg',
      inviteCode: code,
      ownerId: currentUser.uid,
      ownerName: currentUser.displayName,
      isPublic: newSpacePublic,
      vibeXP: 100,
      level: 1,
      blockedKeywords: [],
      roles: [
        {
          id: 'role_founder',
          name: 'Space Founder',
          color: '#c084fc',
          badge: 'Crown',
          position: 100,
          permissions: {
            manageSpace: true,
            manageChannels: true,
            manageRoles: true,
            moderateMembers: true,
            pinMessages: true,
            sendMedia: true,
            bypassSlowmode: true,
          },
        },
        {
          id: 'role_admin',
          name: 'Space Admin',
          color: '#38bdf8',
          badge: 'Shield',
          position: 80,
          permissions: {
            manageSpace: false,
            manageChannels: true,
            manageRoles: true,
            moderateMembers: true,
            pinMessages: true,
            sendMedia: true,
            bypassSlowmode: true,
          },
        },
        {
          id: 'role_member',
          name: 'Viber',
          color: '#94a3b8',
          badge: 'User',
          position: 10,
          permissions: {
            manageSpace: false,
            manageChannels: false,
            manageRoles: false,
            moderateMembers: false,
            pinMessages: false,
            sendMedia: true,
            bypassSlowmode: false,
          },
        },
      ],
      channels: [
        {
          id: `ch_welcome_${Date.now()}`,
          name: 'announcements',
          category: 'Information',
          type: 'announcement',
          topic: 'Welcome & official updates for this Channel Space.',
          slowmodeSeconds: 0,
        },
        {
          id: `ch_gen_${Date.now() + 1}`,
          name: 'general-chat',
          category: 'Text Channels',
          type: 'text',
          topic: 'Main community hangout and conversation.',
          slowmodeSeconds: 0,
        },
        {
          id: `ch_forum_${Date.now() + 2}`,
          name: 'discussion-board',
          category: 'Discussion Forums',
          type: 'forum',
          topic: 'Topic threads and structured discussions.',
          slowmodeSeconds: 0,
        },
        {
          id: `ch_voice_${Date.now() + 3}`,
          name: 'ambient-voice-lounge',
          category: 'Live Lounges',
          type: 'voice',
          topic: 'Live audio and ambient soundscape room.',
          slowmodeSeconds: 0,
        },
      ],
      members: [
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          activityStatus: currentUser.activityStatus || 'Space Founder',
          online: true,
          roleIds: ['role_founder'],
          joinedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      events: [],
      createdAt: new Date().toISOString(),
    };

    onCreateSpace(createdSpace);
    setActiveChannelId(createdSpace.channels[1].id);
    setNewSpaceName('');
    setNewSpaceDesc('');
    setShowCreateSpace(false);
    soundAndPush.playEffect('levelUp');
  };

  const handleAmbientChange = (preset: 'off' | 'lofi' | 'rain' | 'cosmic') => {
    setAmbientPreset(preset);
    if (preset === 'off') {
      soundAndPush.stopAmbient();
    } else {
      soundAndPush.startAmbientSoundscape(preset);
    }
  };

  const getChannelIcon = (type: SpaceChannelType) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 shrink-0 text-amber-400" />;
      case 'forum':
        return <MessageSquare className="w-4 h-4 shrink-0 text-sky-400" />;
      case 'moodboard':
        return <Palette className="w-4 h-4 shrink-0 text-pink-400" />;
      case 'voice':
        return <Volume2 className="w-4 h-4 shrink-0 text-emerald-400" />;
      default:
        return <Hash className="w-4 h-4 shrink-0 text-slate-400" />;
    }
  };

  // Group channels by category
  const categories = Array.from(
    new Set((activeSpace?.channels || []).map((c) => c.category))
  );

  // Ensure currentUser is represented in the roster
  const allSpaceMembers = activeSpace?.members.some((m) => m.uid === currentUser.uid)
    ? activeSpace.members
    : [
        ...(activeSpace?.members || []),
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          activityStatus: currentUser.activityStatus || 'Vibing in Channel Space',
          online: true,
          roleIds: isSpaceOwner ? [activeSpace?.roles[0]?.id || 'role_founder'] : [],
          joinedAt: 'Today',
        },
      ];

  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-[#0b0b12]">
      {/* 1. Space Switcher Mini-Rail + Channel Sidebar */}
      <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/70 dark:bg-[#101018]">
        {/* Space Switcher Pills Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto">
          {spaces.map((sp) => {
            const isActive = sp.id === activeSpace?.id;
            return (
              <button
                key={sp.id}
                onClick={() => {
                  onSelectSpace(sp.id);
                  setActiveChannelId(sp.channels[0]?.id || '');
                  soundAndPush.playEffect('pop');
                }}
                title={sp.name}
                className={`relative group flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-white/10'
                }`}
              >
                <img
                  src={sp.icon}
                  alt={sp.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="truncate max-w-[96px] whitespace-nowrap">{sp.name}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowCreateSpace(true)}
            title="Create New Channel Space"
            className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 hover:bg-purple-500/25 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Active Space Banner & Header */}
        {activeSpace && (
          <div className="relative h-28 w-full overflow-hidden border-b border-slate-200 dark:border-white/10">
            <img
              src={activeSpace.banner}
              alt={activeSpace.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 flex flex-col justify-end">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-white text-base truncate">
                  {activeSpace.name}
                </h2>
                <span className="font-mono tabular-nums text-[11px] text-purple-200 bg-black/50 px-2 py-0.5 rounded">
                  LVL {activeSpace.level} · {activeSpace.vibeXP} XP
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-300">
                <button
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-1 hover:text-white transition-colors font-mono"
                  title="Copy Space Invite Code"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">Copied {activeSpace.inviteCode}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Invite: {activeSpace.inviteCode}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowJoinByCode(true)}
                  className="text-sky-300 hover:underline whitespace-nowrap"
                >
                  Join Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role & Permission Studio Action Bar */}
        <div className="px-3 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowRoleStudio(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 transition-colors whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Roles & Permissions ({activeSpace?.roles.length || 0})</span>
          </button>
          {hasPerm('manageChannels') && (
            <button
              onClick={() => setShowCreateChannel(true)}
              title="Add Channel"
              className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categorized Channels List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {categories.map((cat) => {
            const catChannels = (activeSpace?.channels || []).filter(
              (c) => c.category === cat
            );
            return (
              <div key={cat}>
                <div className="flex items-center justify-between px-2 mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
                  <span>{cat}</span>
                </div>
                <div className="space-y-0.5">
                  {catChannels.map((ch) => {
                    const isSelected = ch.id === currentChannel?.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setActiveChannelId(ch.id);
                          soundAndPush.playEffect('pop');
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-200'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getChannelIcon(ch.type)}
                          <span className="truncate whitespace-nowrap">{ch.name}</span>
                        </div>
                        {ch.slowmodeSeconds > 0 && (
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {ch.slowmodeSeconds}s
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Scheduled Community Events Widget */}
          {activeSpace && activeSpace.events.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-1.5 px-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Scheduled Space Events</span>
              </div>
              <div className="space-y-2">
                {activeSpace.events.map((ev) => {
                  const isRsvped = ev.rsvpUids.includes(currentUser.uid);
                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-xs space-y-1.5"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {ev.title}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {ev.scheduledAt} · #{ev.channelName}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono tabular-nums text-[11px] text-slate-400">
                          {ev.rsvpUids.length} Going
                        </span>
                        <button
                          onClick={() => {
                            const updatedEvents = activeSpace.events.map((item) => {
                              if (item.id !== ev.id) return item;
                              const nextUids = isRsvped
                                ? item.rsvpUids.filter((id) => id !== currentUser.uid)
                                : [...item.rsvpUids, currentUser.uid];
                              return { ...item, rsvpUids: nextUids };
                            });
                            onUpdateSpace({ ...activeSpace, events: updatedEvents });
                            soundAndPush.playEffect('pop');
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            isRsvped
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                              : 'bg-purple-600 text-white hover:bg-purple-500'
                          }`}
                        >
                          {isRsvped ? 'Going ✓' : 'RSVP'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Center Primary Channel Stage */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0c0c14]">
        {/* Channel Top Header */}
        {currentChannel && (
          <div className="h-14 px-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {getChannelIcon(currentChannel.type)}
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base whitespace-nowrap">
                {currentChannel.name}
              </h3>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentChannel.topic}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowPinnedDrawer(!showPinnedDrawer)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  showPinnedDrawer
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  Pinned ({pinnedMessages.length})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Pinned Vault Drawer */}
        {showPinnedDrawer && (
          <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-300">
              <span>Pinned Messages in #{currentChannel?.name}</span>
              <button
                onClick={() => setShowPinnedDrawer(false)}
                className="hover:underline"
              >
                Close
              </button>
            </div>
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-slate-500">
                No pinned messages in this channel yet. Space Founders & Curators can pin key messages.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {pinnedMessages.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-2 rounded-lg bg-white dark:bg-[#14141f] border border-slate-200 dark:border-white/10 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <span
                        className="font-semibold mr-2"
                        style={{ color: pm.authorRoleColor }}
                      >
                        {pm.authorName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {pm.content}
                      </span>
                    </div>
                    {hasPerm('pinMessages') && (
                      <button
                        onClick={() => onTogglePinMessage(pm.id)}
                        className="text-slate-400 hover:text-rose-400 shrink-0"
                        title="Unpin"
                      >
                        Unpin
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Channel Body Content by Type */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Voice & Ambient Stage Mode */}
          {currentChannel?.type === 'voice' && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#13131d] space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-emerald-500">
                    Live Audio & Ambient Stage
                  </span>
                  <h4 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    #{currentChannel.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentChannel.topic}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = !inVoiceStage;
                      setInVoiceStage(next);
                      if (!next) {
                        handleAmbientChange('off');
                      } else {
                        soundAndPush.playEffect('levelUp');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      inVoiceStage
                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {inVoiceStage ? 'Leave Live Stage' : 'Join Live Stage'}
                  </button>
                </div>
              </div>

              {/* Connected Speakers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {allSpaceMembers.slice(0, 4).map((mem, idx) => {
                  const isMe = mem.uid === currentUser.uid;
                  const activeSpeaker = idx === 0 || (isMe && inVoiceStage && !micMuted);
                  return (
                    <div
                      key={mem.uid}
                      className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center ${
                        activeSpeaker
                          ? 'border-emerald-500/60 bg-emerald-500/5'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f17]'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={mem.photoURL}
                          alt={mem.displayName}
                          referrerPolicy="no-referrer"
                          className={`w-14 h-14 rounded-full object-cover ${
                            activeSpeaker ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f0f17]' : ''
                          }`}
                        />
                      </div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white mt-2.5 truncate max-w-full">
                        {mem.displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {activeSpeaker ? 'Speaking · Live' : 'Listening'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stage Controls & Synthesized Web Audio Ambient Mixer */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      micMuted
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{micMuted ? 'Mic Muted' : 'Mic Active'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setHandRaised(!handRaised);
                      soundAndPush.playEffect('pop');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      handRaised
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white'
                    }`}
                  >
                    <Hand className="w-4 h-4" />
                    <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-purple-400 mr-1" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                    Ambient Soundscape:
                  </span>
                  {(['off', 'lofi', 'rain', 'cosmic'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmbientChange(preset)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                        ambientPreset === preset
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Moodboard Canvas Mode */}
          {currentChannel?.type === 'moodboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {channelMessages.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#13131d] overflow-hidden flex flex-col justify-between"
                >
                  {item.mediaUrl && (
                    <div className="h-52 w-full overflow-hidden bg-slate-900">
                      <img
                        src={item.mediaUrl}
                        alt={item.title || 'Moodboard visual'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.authorPhoto}
                          alt={item.authorName}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span
                          className="font-semibold"
                          style={{ color: item.authorRoleColor }}
                        >
                          {item.authorName}
                        </span>
                        <span>·</span>
                        <span>{item.authorRoleName}</span>
                      </div>
                      {hasPerm('pinMessages') && (
                        <button
                          onClick={() => onTogglePinMessage(item.id)}
                          className={`hover:text-amber-400 ${
                            item.pinned ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.title && (
                      <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">
                        {item.title}
                      </h4>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {item.content}
                    </p>
                    {item.palette && item.palette.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {item.palette.map((hex, i) => (
                          <div
                            key={i}
                            className="h-5 flex-1 rounded-md border border-white/10"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : currentChannel?.type === 'forum' ? (
            /* Forum Discussion Board Mode */
            <div className="space-y-4">
              {channelMessages.map((thread) => {
                const upvoted = (thread.upvotes || []).includes(currentUser.uid);
                return (
                  <div
                    key={thread.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#13131d] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <img
                          src={thread.authorPhoto}
                          alt={thread.authorName}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span
                          className="font-semibold"
                          style={{ color: thread.authorRoleColor }}
                        >
                          {thread.authorName}
                        </span>
                        <span>·</span>
                        <span>{thread.authorRoleName}</span>
                        {thread.pinned && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400 font-medium">Pinned Thread</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPerm('pinMessages') && (
                          <button
                            onClick={() => onTogglePinMessage(thread.id)}
                            className="hover:text-amber-400"
                            title="Toggle Pin"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(thread.authorId === currentUser.uid ||
                          hasPerm('moderateMembers')) && (
                          <button
                            onClick={() => onDeleteMessage(thread.id)}
                            className="hover:text-rose-400"
                            title="Delete Thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      {thread.title || 'Discussion Topic'}
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <HighlightedMentionText
                        text={thread.content}
                        currentUsername={currentUser.displayName}
                        onMentionClick={onMentionClick}
                      />
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => onReactMessage(thread.id, '🔥')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          upvoted
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-slate-200/70 dark:bg-white/5 text-slate-500'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="font-mono tabular-nums">
                          {(thread.upvotes?.length || 1) +
                            (thread.reactions['🔥']?.length || 0)}
                        </span>
                      </button>
                      <span className="text-xs text-slate-500">
                        {thread.threadReplies?.length || 0} Replies
                      </span>
                    </div>

                    {/* Thread Replies */}
                    {thread.threadReplies && thread.threadReplies.length > 0 && (
                      <div className="pt-3 mt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                        {thread.threadReplies.map((rep) => (
                          <div
                            key={rep.id}
                            className="flex items-start gap-2.5 text-xs bg-white dark:bg-[#0e0e16] p-2.5 rounded-xl"
                          >
                            <img
                              src={rep.authorPhoto}
                              alt={rep.authorName}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className="font-semibold mr-2"
                                style={{ color: rep.authorRoleColor }}
                              >
                                {rep.authorName}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                <HighlightedMentionText
                                  text={rep.text}
                                  currentUsername={currentUser.displayName}
                                  onMentionClick={onMentionClick}
                                />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Forum Reply */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={forumReplyInputs[thread.id] || ''}
                        onChange={(e) =>
                          setForumReplyInputs({
                            ...forumReplyInputs,
                            [thread.id]: e.target.value,
                          })
                        }
                        placeholder="Reply to this discussion thread..."
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0c0c14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => {
                          const txt = (forumReplyInputs[thread.id] || '').trim();
                          if (!txt) return;
                          onAddForumReply(thread.id, txt);
                          setForumReplyInputs({ ...forumReplyInputs, [thread.id]: '' });
                          soundAndPush.playEffect('send');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 whitespace-nowrap"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Text & Announcement Channel Stream */
            <div className="space-y-3">
              {channelMessages.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    This is the beginning of #{currentChannel?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentChannel?.topic}
                  </p>
                </div>
              ) : (
                channelMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors flex items-start gap-3"
                  >
                    <img
                      src={msg.authorPhoto}
                      alt={msg.authorName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 cursor-pointer"
                      onClick={() =>
                        setSelectedMemberUid(
                          selectedMemberUid === msg.authorId ? null : msg.authorId
                        )
                      }
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      {msg.replyTo && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          <Reply className="w-3 h-3 rotate-180" />
                          <span>Replying to</span>
                          <span className="font-semibold text-slate-300">
                            @{msg.replyTo.authorName}
                          </span>
                          <span className="truncate max-w-xs opacity-75">
                            {msg.replyTo.snippet}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: msg.authorRoleColor }}
                          >
                            {msg.authorName}
                          </span>
                          <span>·</span>
                          <span
                            className="font-medium text-[11px]"
                            style={{ color: msg.authorRoleColor }}
                          >
                            {msg.authorRoleName}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.pinned && (
                            <>
                              <span>·</span>
                              <span className="text-amber-400 text-[11px] font-medium">
                                Pinned
                              </span>
                            </>
                          )}
                        </div>

                        {/* Message Actions Bar */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {['🔥', '❤️', '✨', '😂'].map((emo) => (
                            <button
                              key={emo}
                              onClick={() => onReactMessage(msg.id, emo)}
                              className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-xs"
                            >
                              {emo}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              setReplyingTo({
                                id: msg.id,
                                authorName: msg.authorName,
                                snippet: msg.content.slice(0, 60),
                              })
                            }
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          {hasPerm('pinMessages') && (
                            <button
                              onClick={() => onTogglePinMessage(msg.id)}
                              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 ${
                                msg.pinned ? 'text-amber-400' : 'text-slate-400'
                              }`}
                              title="Pin / Unpin Message"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(msg.authorId === currentUser.uid ||
                            hasPerm('moderateMembers')) && (
                            <button
                              onClick={() => onDeleteMessage(msg.id)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-rose-400"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                        <HighlightedMentionText
                          text={msg.content}
                          currentUsername={currentUser.displayName}
                          onMentionClick={onMentionClick}
                        />
                      </p>

                      {msg.mediaUrl && (
                        <div className="mt-2 max-w-md rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                          <img
                            src={msg.mediaUrl}
                            alt="Shared attachment"
                            referrerPolicy="no-referrer"
                            className="w-full max-h-60 object-cover"
                          />
                        </div>
                      )}

                      {/* Reactions Row */}
                      {Object.keys(msg.reactions || {}).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {Object.entries(msg.reactions).map(([emo, uids]) => {
                            if (!uids || uids.length === 0) return null;
                            const reacted = uids.includes(currentUser.uid);
                            return (
                              <button
                                key={emo}
                                onClick={() => onReactMessage(msg.id, emo)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono tabular-nums transition-colors ${
                                  reacted
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <span>{emo}</span>
                                <span>{uids.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Message / Forum / Moodboard Composer */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#101018] space-y-2.5"
        >
          {autoModWarning && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{autoModWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoModWarning(null)}
                className="underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-purple-500/10 text-xs text-purple-300">
              <span>
                Replying to <strong>@{replyingTo.authorName}</strong>: "{replyingTo.snippet}"
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="hover:underline"
              >
                Cancel
              </button>
            </div>
          )}

          {(currentChannel?.type === 'forum' ||
            currentChannel?.type === 'moodboard') && (
            <input
              type="text"
              value={forumTitleInput}
              onChange={(e) => setForumTitleInput(e.target.value)}
              placeholder={
                currentChannel.type === 'forum'
                  ? 'Discussion thread title...'
                  : 'Moodboard card title...'
              }
              className="w-full px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#161622] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          )}

          {showMediaInput && (
            <input
              type="url"
              value={mediaUrlInput}
              onChange={(e) => setMediaUrlInput(e.target.value)}
              placeholder="Paste image URL (or leave blank)..."
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#161622] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          )}

          {isNovaTypingInSpace && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-xs text-purple-300">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>@NovaAI Companion is responding in real time...</span>
            </div>
          )}

          <MentionAutocompleteBar
            inputValue={messageInput}
            onSelectUsername={(nextText) => setMessageInput(nextText)}
          />

          <div className="flex items-center gap-2">
            {hasPerm('sendMedia') && (
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  showMediaInput
                    ? 'border-purple-500 bg-purple-500/15 text-purple-400'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#161622] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Attach Image / Media URL"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setMessageInput(
                  (prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`
                )
              }
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161622] text-slate-500 hover:text-purple-400 transition-colors"
              title="Mention a user (@username)"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setMessageInput((prev) =>
                  prev.includes('@NovaAI')
                    ? prev
                    : `@NovaAI ${prev || 'hey Nova, hang out with us in this channel!'}`
                )
              }
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors shrink-0"
              title="Summon @NovaAI Companion into this channel"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>@NovaAI</span>
            </button>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message #${currentChannel?.name || 'channel'} (use @username or @NovaAI to mention)...`}
              maxLength={2000}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#161622] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              {currentChannel?.type === 'forum'
                ? 'Post Thread'
                : currentChannel?.type === 'moodboard'
                ? 'Pin Card'
                : 'Send'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Right-Hand Role-Grouped Member Roster */}
      <aside className="hidden xl:flex w-72 shrink-0 border-l border-slate-200 dark:border-white/10 flex-col bg-slate-50/70 dark:bg-[#101018]">
        <div className="h-14 px-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Space Members</span>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-400">
            {allSpaceMembers.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {(activeSpace?.roles || []).map((role) => {
            // Find members whose highest role is this role
            const roleMembers = allSpaceMembers.filter((m) => {
              const memberRolesSorted = (activeSpace?.roles || [])
                .filter((r) => m.roleIds.includes(r.id))
                .sort((a, b) => b.position - a.position);
              const topRole =
                memberRolesSorted[0] ||
                activeSpace?.roles[activeSpace.roles.length - 1];
              return topRole?.id === role.id;
            });

            if (roleMembers.length === 0) return null;

            return (
              <div key={role.id} className="space-y-1.5">
                <div className="flex items-center justify-between px-2 text-[11px] font-semibold">
                  <span style={{ color: role.color }}>{role.name}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {roleMembers.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {roleMembers.map((mem) => {
                    const isSelected = selectedMemberUid === mem.uid;
                    return (
                      <div key={mem.uid} className="space-y-1">
                        <button
                          onClick={() =>
                            setSelectedMemberUid(isSelected ? null : mem.uid)
                          }
                          className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={mem.photoURL}
                              alt={mem.displayName}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div
                                className="text-xs font-semibold truncate"
                                style={{ color: role.color }}
                              >
                                {mem.displayName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {mem.activityStatus || (mem.online ? 'Online' : 'Offline')}
                              </div>
                            </div>
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isSelected ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {/* Member Role Assignment & Action Drawer */}
                        {isSelected && (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161622] border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Assigned Space Roles
                              </span>
                              {mem.uid !== currentUser.uid && (
                                <button
                                  onClick={() =>
                                    onOpenDMWithUser(
                                      mem.uid,
                                      mem.displayName,
                                      mem.photoURL,
                                      role.color
                                    )
                                  }
                                  className="text-purple-400 hover:underline font-medium"
                                >
                                  Message
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {(activeSpace?.roles || []).map((r) => {
                                const assigned = mem.roleIds.includes(r.id);
                                return (
                                  <button
                                    key={r.id}
                                    disabled={!hasPerm('manageRoles')}
                                    onClick={() => handleToggleMemberRole(mem.uid, r.id)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
                                      assigned
                                        ? 'bg-white/10 border-current'
                                        : 'opacity-45 border-transparent hover:opacity-80'
                                    }`}
                                    style={{ color: r.color }}
                                    title={
                                      hasPerm('manageRoles')
                                        ? `Click to toggle ${r.name} role`
                                        : 'Only Space Owner/Admins can assign roles'
                                    }
                                  >
                                    {assigned ? `✓ ${r.name}` : `+ ${r.name}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Modal: Space Role & Permission Studio */}
      {showRoleStudio && activeSpace && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#12121c] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    {activeSpace.name} — Role & Permission Studio
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create custom roles, pick role colors, and configure granular Channel Space permissions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleStudio(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
              >
                Done
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/10">
              {/* Left Column: Role List + Create Role */}
              <div className="p-4 space-y-4">
                <form onSubmit={handleCreateRole} className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Create New Role
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Role name (e.g. DJ)"
                      maxLength={28}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!hasPerm('manageRoles')}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40"
                  >
                    + Add Role
                  </button>
                </form>

                <div className="space-y-1">
                  {activeSpace.roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setEditingRoleId(r.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        editingRoleId === r.id
                          ? 'bg-purple-500/15 border border-purple-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      style={{ color: r.color }}
                    >
                      <span>{r.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Pos {r.position}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right 2 Columns: Permission Matrix & AutoMod */}
              <div className="md:col-span-2 p-5 space-y-6">
                {(() => {
                  const selectedRole =
                    activeSpace.roles.find((r) => r.id === editingRoleId) ||
                    activeSpace.roles[0];
                  if (!selectedRole) return null;

                  const permLabels: {
                    key: keyof SpaceRole['permissions'];
                    title: string;
                    desc: string;
                  }[] = [
                    {
                      key: 'manageSpace',
                      title: 'Manage Channel Space',
                      desc: 'Edit Space name, banner, visibility, and AutoMod rules.',
                    },
                    {
                      key: 'manageChannels',
                      title: 'Manage Channels',
                      desc: 'Create, edit, or reorder text, forum, moodboard, and voice channels.',
                    },
                    {
                      key: 'manageRoles',
                      title: 'Assign & Manage Roles',
                      desc: 'Create custom roles and assign/revoke roles on Space members.',
                    },
                    {
                      key: 'moderateMembers',
                      title: 'Moderate & Delete Messages',
                      desc: 'Remove inappropriate messages or mute disruptive members.',
                    },
                    {
                      key: 'pinMessages',
                      title: 'Pin Messages to Vault',
                      desc: 'Pin and unpin highlights inside any channel.',
                    },
                    {
                      key: 'sendMedia',
                      title: 'Embed Media & Moodboard Cards',
                      desc: 'Share images, music embeds, and color palettes.',
                    },
                    {
                      key: 'bypassSlowmode',
                      title: 'Bypass Channel Slowmode',
                      desc: 'Post without cooldown timers in slowmode-enabled channels.',
                    },
                  ];

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span
                            className="text-base font-display font-bold"
                            style={{ color: selectedRole.color }}
                          >
                            {selectedRole.name}
                          </span>
                          <p className="text-xs text-slate-500">
                            Toggle permissions granted to members holding this role:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {permLabels.map((item) => {
                          const enabled = selectedRole.permissions[item.key];
                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]"
                            >
                              <div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {item.desc}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={!hasPerm('manageRoles')}
                                onClick={() =>
                                  handleToggleRolePermission(selectedRole.id, item.key)
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  enabled
                                    ? 'bg-emerald-500/20 text-emerald-500'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                }`}
                              >
                                {enabled ? 'Allowed' : 'Off'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Space AutoMod Keyword Filter */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Space AutoMod — Blocked Keywords
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newBlockedKeyword}
                      onChange={(e) => setNewBlockedKeyword(e.target.value)}
                      placeholder="Add word or phrase to auto-block..."
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const kw = newBlockedKeyword.trim().toLowerCase();
                        if (!kw) return;
                        onUpdateSpace({
                          ...activeSpace,
                          blockedKeywords: [...activeSpace.blockedKeywords, kw],
                        });
                        setNewBlockedKeyword('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 dark:bg-white/10 text-white"
                    >
                      Add Filter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {activeSpace.blockedKeywords.map((kw) => (
                      <button
                        key={kw}
                        onClick={() =>
                          onUpdateSpace({
                            ...activeSpace,
                            blockedKeywords: activeSpace.blockedKeywords.filter(
                              (w) => w !== kw
                            ),
                          })
                        }
                        className="hover:text-rose-400"
                      >
                        #{kw} ×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Channel */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateChannelSubmit}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121c] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Create Channel in {activeSpace?.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Channel Type
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as SpaceChannelType)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="text"># Text Channel</option>
                  <option value="announcement">📣 Announcement Channel</option>
                  <option value="forum">💬 Discussion Forum Board</option>
                  <option value="moodboard">🎨 Collaborative Moodboard</option>
                  <option value="voice">🔊 Live Voice & Ambient Stage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. synth-jam-chat"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Channel Topic
                </label>
                <input
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Slowmode Cooldown (seconds)
                </label>
                <select
                  value={newChannelSlowmode}
                  onChange={(e) => setNewChannelSlowmode(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value={0}>Off</option>
                  <option value={5}>5 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateChannel(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create New Channel Space */}
      {showCreateSpace && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewSpace}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12121c] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Create a New Channel Space
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Launch your own community server with customizable roles, discussion forums, moodboards, and live lounges.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Channel Space Name
                </label>
                <input
                  type="text"
                  required
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="e.g. Midnight Photographers"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  placeholder="What brings people together in this Space?"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Publicly Discoverable
                </span>
                <button
                  type="button"
                  onClick={() => setNewSpacePublic(!newSpacePublic)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    newSpacePublic
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                  }`}
                >
                  {newSpacePublic ? 'Public Space' : 'Private (Invite Only)'}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateSpace(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white"
              >
                Launch Channel Space
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Join Space by Invite Code */}
      {showJoinByCode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#12121c] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Join Channel Space via Invite Code
            </h3>
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              placeholder="Enter code (e.g. VIBE-HQ26 or SYNTH-808)"
              className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowJoinByCode(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const found = spaces.find(
                    (s) =>
                      s.inviteCode.toLowerCase() === inviteCodeInput.trim().toLowerCase()
                  );
                  if (found) {
                    onSelectSpace(found.id);
                    setActiveChannelId(found.channels[0]?.id || '');
                    setShowJoinByCode(false);
                    setInviteCodeInput('');
                    soundAndPush.playEffect('levelUp');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white"
              >
                Join Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

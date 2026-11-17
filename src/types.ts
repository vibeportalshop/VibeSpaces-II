export type ProfileThemeId = 'default' | 'ocean' | 'sunset' | 'matrix' | 'rose' | 'monochrome';

export type PlatformRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL: string;
  bio: string;
  mood: string;
  activityStatus: string;
  profileTheme: ProfileThemeId;
  isPrivate: boolean;
  streakCount: number;
  role: PlatformRole;
  interests: string[];
  badges: string[];
  createdAt: string;
}

export interface VibeComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: string;
}

export interface VibePollOption {
  text: string;
  votes: string[]; // array of voter UIDs
}

export interface VibePost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorColor: string;
  isOperator?: boolean;
  anonymous?: boolean;
  pinned?: boolean;
  category: string;
  mediaUrl?: string;
  mediaType?: 'none' | 'image' | 'music' | 'moodboard';
  musicTrackTitle?: string;
  musicArtist?: string;
  moodPalette?: string[];
  reactions: {
    heart: string[];
    fire: string[];
    laugh: string[];
    cry: string[];
  };
  poll?: {
    question: string;
    options: VibePollOption[];
  };
  comments: VibeComment[];
  createdAt: string;
  source?: 'cloud' | 'legacy';
}

export interface SpaceRolePermissions {
  manageSpace: boolean;
  manageChannels: boolean;
  manageRoles: boolean;
  moderateMembers: boolean;
  pinMessages: boolean;
  sendMedia: boolean;
  bypassSlowmode: boolean;
}

export interface SpaceRole {
  id: string;
  name: string;
  color: string;
  badge: string;
  position: number; // higher means higher in hierarchy
  permissions: SpaceRolePermissions;
}

export type SpaceChannelType = 'text' | 'announcement' | 'forum' | 'moodboard' | 'voice';

export interface SpaceChannel {
  id: string;
  name: string;
  category: string;
  type: SpaceChannelType;
  topic: string;
  slowmodeSeconds: number;
  restrictedRoleIds?: string[];
}

export interface SpaceMember {
  uid: string;
  displayName: string;
  photoURL: string;
  activityStatus: string;
  online: boolean;
  roleIds: string[];
  joinedAt: string;
  muted?: boolean;
}

export interface SpaceEvent {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  channelName: string;
  rsvpUids: string[];
}

export interface ChannelSpace {
  id: string;
  name: string;
  description: string;
  icon: string;
  banner: string;
  inviteCode: string;
  ownerId: string;
  ownerName: string;
  isPublic: boolean;
  vibeXP: number;
  level: number;
  roles: SpaceRole[];
  channels: SpaceChannel[];
  members: SpaceMember[];
  events: SpaceEvent[];
  blockedKeywords: string[];
  createdAt: string;
}

export interface SpaceMessage {
  id: string;
  spaceId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorRoleName: string;
  authorRoleColor: string;
  authorRoleBadge?: string;
  content: string;
  title?: string; // used for forum threads or moodboard pins
  mediaUrl?: string;
  palette?: string[];
  replyTo?: {
    id: string;
    authorName: string;
    snippet: string;
  };
  pinned?: boolean;
  upvotes?: string[];
  reactions: Record<string, string[]>;
  threadReplies?: {
    id: string;
    authorName: string;
    authorPhoto: string;
    authorRoleColor: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface DirectMessageItem {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  text: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DMConversation {
  otherUid: string;
  otherName: string;
  otherPhoto: string;
  otherColor: string;
  otherStatus: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  disappearHours: 0 | 12 | 24 | 48;
}

export interface CustomNotificationRule {
  id: string;
  ownerId: string;
  name: string;
  conditionField: 'keyword' | 'author' | 'space' | 'category';
  conditionValue: string;
  action: 'mute' | 'priority_push' | 'email_digest' | 'auto_flag';
  enabled: boolean;
  triggeredCount: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'reaction' | 'comment' | 'mention' | 'space_invite' | 'role_assigned' | 'system' | 'digest';
  title: string;
  body: string;
  sourceName: string;
  spaceName?: string;
  read: boolean;
  priority: 'normal' | 'high' | 'muted';
  routedToEmailDigest: boolean;
  matchedRuleName?: string;
  createdAt: string;
}

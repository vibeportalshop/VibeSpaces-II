import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Palette,
  Lock,
  Unlock,
  Check,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ChannelSpace, ProfileThemeId, UserProfile } from '../types';
import {
  CONSTELLATION_AVATARS,
  LEADERBOARD_USERS,
  PROFILE_THEMES,
  VIBE_INTERESTS,
} from '../data/seedData';
import { soundAndPush } from '../utils/soundAndPush';

interface LeaderboardsAndProfileViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  spaces: ChannelSpace[];
  onNavigateToSpace: (spaceId: string) => void;
}

export const LeaderboardsAndProfileView: React.FC<
  LeaderboardsAndProfileViewProps
> = ({ currentUser, onUpdateProfile, spaces, onNavigateToSpace }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio);
  const [mood, setMood] = useState(currentUser.mood);
  const [activityStatus, setActivityStatus] = useState(
    currentUser.activityStatus
  );
  const [savedToast, setSavedToast] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      displayName: displayName.trim() || currentUser.displayName,
      bio: bio.trim(),
      mood: mood.trim(),
      activityStatus: activityStatus.trim(),
    });
    soundAndPush.playEffect('levelUp');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleToggleInterest = (interest: string) => {
    const exists = currentUser.interests.includes(interest);
    const next = exists
      ? currentUser.interests.filter((i) => i !== interest)
      : [...currentUser.interests, interest].slice(0, 12);
    onUpdateProfile({ interests: next });
    soundAndPush.playEffect('pop');
  };

  // Merge currentUser into leaderboard for real-time ranking
  const allRankedUsers = [
    ...LEADERBOARD_USERS.filter((u) => u.uid !== currentUser.uid),
    currentUser,
  ].sort((a, b) => b.streakCount - a.streakCount);

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">
      {/* Section 1: Profile Theme & Identity Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Profile Card Preview & Avatar Selector (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400">
              Live Profile Identity
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateProfile({ isPrivate: !currentUser.isPrivate })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                currentUser.isPrivate
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {currentUser.isPrivate ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Profile</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Public Profile</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-purple-500/40"
            />
            <div className="space-y-1 min-w-0">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white truncate">
                {currentUser.displayName}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.mood} · Role: {currentUser.role.toUpperCase()}
              </div>
              <div className="text-xs text-purple-400 font-medium">
                {currentUser.activityStatus}
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentUser.bio || 'No bio added yet.'}
          </p>

          {/* Earned Badges */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Earned Community Badges</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              {currentUser.badges.map((b, idx) => (
                <React.Fragment key={b}>
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <span className="font-medium text-amber-400">{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Constellation & Planet Avatar Picker */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Constellation & Planet Avatar
            </div>
            <div className="grid grid-cols-5 gap-2">
              {CONSTELLATION_AVATARS.map((av) => {
                const selected = currentUser.photoURL === av.url;
                return (
                  <button
                    key={av.name}
                    type="button"
                    onClick={() => {
                      onUpdateProfile({ photoURL: av.url });
                      soundAndPush.playEffect('pop');
                    }}
                    className={`p-1 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      selected
                        ? 'border-purple-500 bg-purple-500/15'
                        : 'border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                    }`}
                    title={av.name}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="text-[10px] text-slate-500 truncate max-w-full">
                      {av.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Theme Customizer & Profile Form (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-6">
          {/* 6 Profile Themes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                User Profile Theme & Accent Palette
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PROFILE_THEMES.map((theme) => {
                const isSelected = currentUser.profileTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onUpdateProfile({ profileTheme: theme.id });
                      soundAndPush.playEffect('pop');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all space-y-2 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: theme.primaryHex }}
                        />
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: theme.secondaryHex }}
                        />
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {theme.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {theme.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Display Username
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Current Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="🌙 Chill">🌙 Chill</option>
                  <option value="🎧 Vibing">🎧 Vibing</option>
                  <option value="✨ Building the future">✨ Building the future</option>
                  <option value="💭 Thoughtful">💭 Thoughtful</option>
                  <option value="🔥 Inspired">🔥 Inspired</option>
                  <option value="☕ Quiet Focus">☕ Quiet Focus</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Rich Presence / Activity Status (shown in Channel Space roster)
              </label>
              <input
                type="text"
                maxLength={100}
                value={activityStatus}
                onChange={(e) => setActivityStatus(e.target.value)}
                placeholder="e.g. Listening to Midnight Lo-Fi in Vibe Cartel HQ"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Profile Bio
              </label>
              <textarea
                rows={2}
                maxLength={240}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
            </div>

            {/* Interests Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Interests & Vibe Topics
              </label>
              <div className="flex flex-wrap gap-1.5">
                {VIBE_INTERESTS.slice(0, 14).map((interest) => {
                  const active = currentUser.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleToggleInterest(interest)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedToast ? (
                <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                  <UserCheck className="w-4 h-4" />
                  <span>Profile & Theme Saved!</span>
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 2: Gamified Vibe Streaks & Weekly Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vibe Streaks Leaderboard */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Weekly Vibe Streak Leaderboard
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Season 04</span>
          </div>

          <div className="divide-y divide-slate-200/60 dark:divide-white/5">
            {allRankedUsers.map((u, idx) => (
              <div
                key={u.uid}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono tabular-nums text-xs font-bold text-slate-400 w-6">
                    0{idx + 1}.
                  </span>
                  <img
                    src={u.photoURL}
                    alt={u.displayName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {u.displayName}{' '}
                      {u.uid === currentUser.uid && (
                        <span className="text-xs text-purple-400">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {u.badges.join(' · ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm font-bold text-amber-400 shrink-0">
                  <Flame className="w-4 h-4" />
                  <span>{u.streakCount}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Channel Spaces by Organic Vibe Leveling */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Top Channel Spaces (Organic Vibe XP)
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-mono">100% Free Perks</span>
          </div>

          <div className="divide-y divide-slate-200/60 dark:divide-white/5">
            {[...spaces]
              .sort((a, b) => b.vibeXP - a.vibeXP)
              .map((sp, idx) => (
                <div
                  key={sp.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-400 w-6">
                      0{idx + 1}.
                    </span>
                    <img
                      src={sp.icon}
                      alt={sp.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {sp.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Level {sp.level} · {sp.vibeXP} Vibe XP · {sp.members.length} members
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateToSpace(sp.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/15 text-purple-400 hover:bg-purple-600 hover:text-white transition-colors shrink-0"
                  >
                    Open Space
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

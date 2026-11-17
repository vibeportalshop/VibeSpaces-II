import React, { useState } from 'react';
import {
  Flame,
  Sparkles,
  Bookmark,
  Pin,
  Trash2,
  MessageCircle,
  BarChart2,
  Music,
  Palette,
  Image as ImageIcon,
  Search,
  Play,
  Square,
  Send,
  ArrowUpRight,
  EyeOff,
  AtSign,
  Bot,
} from 'lucide-react';
import { ChannelSpace, UserProfile, VibePost } from '../types';
import { DAILY_VIBE_PROMPTS, VIBE_INTERESTS } from '../data/seedData';
import { soundAndPush } from '../utils/soundAndPush';
import {
  HighlightedMentionText,
  MentionAutocompleteBar,
} from '../utils/mentionText';

interface GlobalFeedViewProps {
  vibes: VibePost[];
  savedVibeIds: string[];
  onCreateVibe: (vibe: Omit<VibePost, 'id' | 'createdAt' | 'reactions' | 'comments'>) => void;
  onReactVibe: (vibeId: string, reactionKey: keyof VibePost['reactions']) => void;
  onVotePoll: (vibeId: string, optionIdx: number) => void;
  onCommentVibe: (vibeId: string, commentText: string) => void;
  onToggleSaveVibe: (vibeId: string) => void;
  onTogglePinVibe: (vibeId: string) => void;
  onDeleteVibe: (vibeId: string) => void;
  currentUser: UserProfile;
  spaces: ChannelSpace[];
  onNavigateToSpace: (spaceId: string) => void;
  onOpenProfileModal: (userId: string) => void;
  onMentionClick?: (username: string) => void;
  onOpenNovaChat?: () => void;
}

export const GlobalFeedView: React.FC<GlobalFeedViewProps> = ({
  vibes,
  savedVibeIds,
  onCreateVibe,
  onReactVibe,
  onVotePoll,
  onCommentVibe,
  onToggleSaveVibe,
  onTogglePinVibe,
  onDeleteVibe,
  currentUser,
  spaces,
  onNavigateToSpace,
  onMentionClick,
  onOpenNovaChat,
}) => {
  const [composerMode, setComposerMode] = useState<'standard' | 'poll' | 'music' | 'moodboard'>('standard');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Music');
  const [anonymous, setAnonymous] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [musicTrackTitle, setMusicTrackTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '', '', '']);

  // Feed Filter & Search
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pinned' | 'music' | 'moodboard' | 'polls' | 'saved'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const isAdminOrOwner =
    currentUser.role === 'owner' || currentUser.role === 'admin';

  const handleUseDailyPrompt = () => {
    const randomPrompt =
      DAILY_VIBE_PROMPTS[Math.floor(Math.random() * DAILY_VIBE_PROMPTS.length)];
    setTitle(randomPrompt);
    soundAndPush.playEffect('pop');
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const validPollOpts = pollOptions
      .map((o) => o.trim())
      .filter(Boolean)
      .map((text) => ({ text, votes: [] }));

    onCreateVibe({
      title: title.trim(),
      content: content.trim(),
      authorId: currentUser.uid,
      authorName: anonymous ? 'Anonymous Viber' : currentUser.displayName,
      authorPhoto: anonymous
        ? 'https://api.dicebear.com/9.x/shapes/svg?seed=Anonymous'
        : currentUser.photoURL,
      authorColor: '#c084fc',
      isOperator: isAdminOrOwner && !anonymous,
      anonymous,
      pinned: false,
      category,
      mediaUrl:
        mediaUrl.trim() ||
        (composerMode === 'moodboard'
          ? '/src/assets/images/creative_design_workspace_card_1793960033053.jpg'
          : composerMode === 'music'
          ? '/src/assets/images/lofi_music_studio_card_1793960032616.jpg'
          : undefined),
      mediaType:
        composerMode === 'music'
          ? 'music'
          : composerMode === 'moodboard'
          ? 'moodboard'
          : mediaUrl.trim()
          ? 'image'
          : 'none',
      musicTrackTitle:
        composerMode === 'music'
          ? musicTrackTitle.trim() || 'Untitled Midnight Tape'
          : undefined,
      musicArtist:
        composerMode === 'music'
          ? musicArtist.trim() || currentUser.displayName
          : undefined,
      moodPalette:
        composerMode === 'moodboard'
          ? ['#08080d', '#c084fc', '#38bdf8', '#f59e0b']
          : undefined,
      poll:
        composerMode === 'poll' && validPollOpts.length >= 2
          ? {
              question: pollQuestion.trim() || title.trim(),
              options: validPollOpts,
            }
          : undefined,
    });

    setTitle('');
    setContent('');
    setMediaUrl('');
    setMusicTrackTitle('');
    setMusicArtist('');
    setPollQuestion('');
    setPollOptions(['', '', '', '']);
    setComposerMode('standard');
    soundAndPush.playEffect('send');
  };

  const filteredVibes = vibes
    .filter((v) => {
      if (activeFilter === 'pinned' && !v.pinned) return false;
      if (activeFilter === 'music' && v.mediaType !== 'music') return false;
      if (activeFilter === 'moodboard' && v.mediaType !== 'moodboard') return false;
      if (activeFilter === 'polls' && !v.poll) return false;
      if (activeFilter === 'saved' && !savedVibeIds.includes(v.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.content.toLowerCase().includes(q) ||
          v.authorName.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const togglePlayPreview = (vibeId: string) => {
    if (playingTrackId === vibeId) {
      soundAndPush.stopAmbient();
      setPlayingTrackId(null);
    } else {
      soundAndPush.startAmbientSoundscape('lofi');
      setPlayingTrackId(vibeId);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Center Primary Social Feed (8 Cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Vibe Composer Card */}
        <form
          onSubmit={handlePublish}
          className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
              {(
                [
                  { id: 'standard', label: 'Vibe Post', icon: Sparkles },
                  { id: 'poll', label: 'Poll', icon: BarChart2 },
                  { id: 'music', label: 'Music Card', icon: Music },
                  { id: 'moodboard', label: 'Moodboard Pin', icon: Palette },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = composerMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setComposerMode(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#1e1e2d] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleUseDailyPrompt}
              className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap"
            >
              Use Daily Prompt
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your vibe a title or headline..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
              >
                {VIBE_INTERESTS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              required
              rows={3}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share a quiet thought, story, or project update... Type @ to mention users or @NovaAI"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />

            <MentionAutocompleteBar
              inputValue={content}
              onSelectUsername={(nextText) => setContent(nextText)}
            />

            {/* Mode-Specific Composer Inputs */}
            {composerMode === 'music' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                <input
                  type="text"
                  value={musicTrackTitle}
                  onChange={(e) => setMusicTrackTitle(e.target.value)}
                  placeholder="Track or Mix Title (e.g. Midnight Tape #4)"
                  className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-[#14141f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={musicArtist}
                  onChange={(e) => setMusicArtist(e.target.value)}
                  placeholder="Artist / Soundscape Creator"
                  className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-[#14141f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {composerMode === 'poll' && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2.5">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Poll Question..."
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#14141f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[idx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      placeholder={`Option ${idx + 1}${idx < 2 ? ' (required)' : ' (optional)'}`}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#14141f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  ))}
                </div>
              </div>
            )}

            {(composerMode === 'moodboard' || composerMode === 'standard') && (
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Optional image URL for visual card..."
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnonymous(!anonymous)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  anonymous
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>{anonymous ? 'Posting Anonymously' : 'Post Anonymously'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setContent((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-500 hover:bg-purple-500/10 transition-colors"
                title="Insert @mention"
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>Mention</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white hover:opacity-95 transition-opacity whitespace-nowrap"
            >
              Publish Vibe
            </button>
          </div>
        </form>

        {/* Feed Filter Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#12121a] border border-slate-200 dark:border-white/10 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Vibes' },
                { id: 'pinned', label: 'Pinned' },
                { id: 'music', label: 'Music Cards' },
                { id: 'moodboard', label: 'Moodboards' },
                { id: 'polls', label: 'Polls' },
                { id: 'saved', label: `Saved (${savedVibeIds.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === tab.id
                    ? 'bg-white dark:bg-[#1f1f2e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter feed..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#12121a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Feed Stream */}
        <div className="space-y-5">
          {filteredVibes.length === 0 ? (
            <div className="p-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No vibes match this filter yet
              </p>
              <p className="text-xs text-slate-500">
                Try switching back to All Vibes or publish a new post above.
              </p>
            </div>
          ) : (
            filteredVibes.map((vibe) => {
              const isSaved = savedVibeIds.includes(vibe.id);
              const isPlaying = playingTrackId === vibe.id;

              return (
                <article
                  key={vibe.id}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4 transition-colors"
                >
                  {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                      <img
                        src={vibe.authorPhoto}
                        alt={vibe.authorName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <span
                        className="font-semibold text-slate-900 dark:text-white truncate"
                        style={{
                          color: vibe.isOperator ? '#c084fc' : vibe.authorColor,
                        }}
                      >
                        {vibe.authorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{vibe.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        {new Date(vibe.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {vibe.pinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-500 font-medium">Pinned</span>
                        </>
                      )}
                      {vibe.source === 'legacy' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-400">Synced DB</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleSaveVibe(vibe.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved
                            ? 'text-purple-400 bg-purple-500/10'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save Vibe'}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                      {isAdminOrOwner && (
                        <button
                          onClick={() => onTogglePinVibe(vibe.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            vibe.pinned
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-slate-400 hover:text-amber-400'
                          }`}
                          title="Pin / Unpin Vibe"
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                      )}
                      {(vibe.authorId === currentUser.uid || isAdminOrOwner) && (
                        <button
                          onClick={() => onDeleteVibe(vibe.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Vibe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Headline & Body Prose */}
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white leading-snug">
                      {vibe.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      <HighlightedMentionText
                        text={vibe.content}
                        currentUsername={currentUser.displayName}
                        onMentionClick={onMentionClick}
                      />
                    </p>
                  </div>

                  {/* Embedded Music Card */}
                  {vibe.mediaType === 'music' && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171723] overflow-hidden flex flex-col sm:flex-row items-center gap-4 p-3.5">
                      {vibe.mediaUrl && (
                        <img
                          src={vibe.mediaUrl}
                          alt={vibe.musicTrackTitle || vibe.title}
                          referrerPolicy="no-referrer"
                          className="w-full sm:w-28 h-28 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5 w-full">
                        <div className="text-xs font-medium text-purple-400">
                          Embedded Vibe Audio Card
                        </div>
                        <div className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                          {vibe.musicTrackTitle || vibe.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {vibe.musicArtist || vibe.authorName}
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => togglePlayPreview(vibe.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isPlaying
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-purple-600 text-white hover:bg-purple-500'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Synth Preview</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Play Ambient Synth Preview</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Image / Moodboard Card */}
                  {vibe.mediaUrl && vibe.mediaType !== 'music' && (
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-96 bg-slate-900">
                        <img
                          src={vibe.mediaUrl}
                          alt={vibe.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {vibe.moodPalette && vibe.moodPalette.length > 0 && (
                        <div className="flex items-center gap-2">
                          {vibe.moodPalette.map((hex, i) => (
                            <div
                              key={i}
                              className="h-4 flex-1 rounded border border-white/10"
                              style={{ backgroundColor: hex }}
                              title={`Mood Swatch: ${hex}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Poll */}
                  {vibe.poll && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171723] border border-slate-200 dark:border-white/10 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {vibe.poll.question}
                      </div>
                      {(() => {
                        const totalVotes = vibe.poll.options.reduce(
                          (acc, o) => acc + o.votes.length,
                          0
                        );
                        return (
                          <div className="space-y-2">
                            {vibe.poll.options.map((opt, idx) => {
                              const pct =
                                totalVotes > 0
                                  ? Math.round((opt.votes.length / totalVotes) * 100)
                                  : 0;
                              const voted = opt.votes.includes(currentUser.uid);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => onVotePoll(vibe.id, idx)}
                                  className={`w-full relative overflow-hidden p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                                    voted
                                      ? 'border-purple-500 bg-purple-500/10 text-slate-900 dark:text-white font-semibold'
                                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] text-slate-700 dark:text-slate-300 hover:border-purple-500/40'
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  <span className="font-mono tabular-nums text-slate-400">
                                    {pct}% ({opt.votes.length})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Reaction Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { key: 'heart', emoji: '❤️' },
                          { key: 'fire', emoji: '🔥' },
                          { key: 'laugh', emoji: '😂' },
                          { key: 'cry', emoji: '😢' },
                        ] as const
                      ).map((r) => {
                        const list = vibe.reactions[r.key] || [];
                        const active = list.includes(currentUser.uid);
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => onReactVibe(vibe.id, r.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono tabular-nums transition-colors ${
                              active
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{list.length}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                      <MessageCircle className="w-4 h-4" />
                      <span>{vibe.comments.length} Comments</span>
                    </div>
                  </div>

                  {/* Comments List & Input */}
                  <div className="space-y-2.5 pt-2">
                    {vibe.comments.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2.5 text-xs bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl"
                      >
                        <img
                          src={c.authorPhoto}
                          alt={c.authorName}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {c.authorName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {c.createdAt}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                            <HighlightedMentionText
                              text={c.text}
                              currentUsername={currentUser.displayName}
                              onMentionClick={onMentionClick}
                            />
                          </p>
                        </div>
                      </div>
                    ))}

                    <MentionAutocompleteBar
                      inputValue={commentInputs[vibe.id] || ''}
                      onSelectUsername={(nextText) =>
                        setCommentInputs({
                          ...commentInputs,
                          [vibe.id]: nextText,
                        })
                      }
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[vibe.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({
                            ...commentInputs,
                            [vibe.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const txt = (commentInputs[vibe.id] || '').trim();
                            if (!txt) return;
                            onCommentVibe(vibe.id, txt);
                            setCommentInputs({ ...commentInputs, [vibe.id]: '' });
                          }
                        }}
                        placeholder="Write a comment... Use @username or @NovaAI to mention"
                        className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const txt = (commentInputs[vibe.id] || '').trim();
                          if (!txt) return;
                          onCommentVibe(vibe.id, txt);
                          setCommentInputs({ ...commentInputs, [vibe.id]: '' });
                        }}
                        className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                        title="Post Comment"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Right Contextual Sidebar (4 Cols) */}
      <aside className="lg:col-span-4 space-y-6">
        {/* Real-Time AI Companion Card (@NovaAI) */}
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-white dark:bg-[#12121a] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  @NovaAI Companion
                </h4>
                <p className="text-[11px] text-purple-400 font-medium">
                  Always Online · Real-Time Streaming AI
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            When no one else is around, chat live with <strong>@NovaAI</strong> in Direct Messages or tag <code className="text-purple-400 font-mono">@NovaAI</code> in any post, comment, or Channel Space!
          </p>
          <button
            type="button"
            onClick={onOpenNovaChat}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-sky-600 text-white hover:opacity-95 transition-opacity"
          >
            Open Live Chat with @NovaAI
          </button>
        </div>

        {/* Daily Streak & Profile Summary */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Daily Vibe Streak
              </h4>
            </div>
            <span className="font-mono tabular-nums text-lg font-bold text-amber-400">
              {currentUser.streakCount} Days
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Post a Vibe or participate in a Channel Space daily to unlock community badges and boost your Space XP.
          </p>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-purple-500"
              style={{ width: `${Math.min(100, (currentUser.streakCount / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* Active Channel Spaces Directory */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Active Channel Spaces
            </h4>
            <span className="text-xs text-purple-400 font-mono tabular-nums">
              {spaces.length} Live
            </span>
          </div>
          <div className="space-y-3">
            {spaces.map((sp) => (
              <div
                key={sp.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={sp.icon}
                    alt={sp.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {sp.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      LVL {sp.level} · {sp.members.length} members · {sp.roles.length} roles
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToSpace(sp.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors shrink-0"
                >
                  <span>Enter</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

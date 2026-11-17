import React from 'react';

export const KNOWN_MENTION_USERS = [
  {
    uid: 'ai_nova',
    displayName: 'NovaAI',
    photoURL: 'https://api.dicebear.com/9.x/shapes/svg?seed=NovaAI&backgroundColor=3b0764',
    role: 'AI Companion · Always Online',
    color: '#c084fc',
    isAI: true,
  },
  {
    uid: 'operator_vibecartel',
    displayName: 'VibeSpacesOfficial',
    photoURL: '/Spaces.png',
    role: 'Platform Founder',
    color: '#c084fc',
    isAI: false,
  },
  {
    uid: 'u_aria',
    displayName: 'AriaVibes',
    photoURL: 'https://api.dicebear.com/9.x/shapes/svg?seed=Cassiopeia&backgroundColor=1e1b4b',
    role: 'Vibe Architect',
    color: '#38bdf8',
    isAI: false,
  },
  {
    uid: 'u_kael',
    displayName: 'KaelSynth',
    photoURL: 'https://api.dicebear.com/9.x/shapes/svg?seed=Lyra&backgroundColor=172554',
    role: 'Mood Curator',
    color: '#34d399',
    isAI: false,
  },
  {
    uid: 'u_sora',
    displayName: 'SoraDesign',
    photoURL: 'https://api.dicebear.com/9.x/shapes/svg?seed=Andromeda&backgroundColor=2e1065',
    role: 'Design Principal',
    color: '#f472b6',
    isAI: false,
  },
  {
    uid: 'u_zayn',
    displayName: 'ZaynCode',
    photoURL: 'https://api.dicebear.com/9.x/shapes/svg?seed=Draco&backgroundColor=090d16',
    role: 'Craftsperson',
    color: '#22c55e',
    isAI: false,
  },
];

/**
 * Extracts all unique @username handles from text (case-insensitive match against known users or any @handle).
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9_-]+)/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

/**
 * Checks whether the active input has a trailing @mention query (e.g. "hey @ar")
 * so we can show an interactive autocomplete suggestion bar.
 */
export function getActiveMentionQuery(text: string): string | null {
  const match = text.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
  if (!match) return null;
  return match[1];
}

/**
 * Replaces the trailing @query in text with `@SelectedUsername `
 */
export function applyMentionAutocomplete(text: string, username: string): string {
  return text.replace(/(?:^|\s)@([a-zA-Z0-9_-]*)$/, (full) => {
    const leadingSpace = full.startsWith(' ') ? ' ' : '';
    return `${leadingSpace}@${username} `;
  });
}

/**
 * Renders text with highlighted @mentions.
 * Clicking a mention can optionally trigger a callback (e.g., open DM or profile).
 */
export const HighlightedMentionText: React.FC<{
  text: string;
  currentUsername?: string;
  onMentionClick?: (username: string) => void;
  invertedBubble?: boolean;
}> = ({ text, currentUsername, onMentionClick, invertedBubble = false }) => {
  if (!text) return null;

  const parts = text.split(/(@[a-zA-Z0-9_-]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1);
          const isMe =
            currentUsername &&
            handle.toLowerCase() === currentUsername.toLowerCase();
          const isNova = handle.toLowerCase() === 'novaai';

          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onMentionClick) onMentionClick(handle);
              }}
              className={`inline-flex items-center font-semibold px-1.5 py-0.2 rounded-md mx-0.5 transition-colors cursor-pointer ${
                invertedBubble
                  ? 'bg-white/25 text-white underline decoration-white/60 hover:bg-white/35'
                  : isMe
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                  : isNova
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 hover:bg-purple-500/35'
                  : 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/25'
              }`}
              title={`Mentioned ${part}${isNova ? ' (AI Companion)' : ''}`}
            >
              {part}
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};

/**
 * Reusable autocomplete suggestion bar when typing '@' in any input or textarea.
 */
export const MentionAutocompleteBar: React.FC<{
  inputValue: string;
  onSelectUsername: (newText: string, username: string) => void;
}> = ({ inputValue, onSelectUsername }) => {
  const query = getActiveMentionQuery(inputValue);
  if (query === null) return null;

  const qLower = query.toLowerCase();
  const candidates = KNOWN_MENTION_USERS.filter(
    (u) =>
      u.displayName.toLowerCase().includes(qLower) ||
      u.role.toLowerCase().includes(qLower)
  );

  if (candidates.length === 0) return null;

  return (
    <div className="p-2 rounded-xl border border-purple-500/30 bg-white dark:bg-[#161624] shadow-lg space-y-1.5">
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
        <span>Mention a user or @NovaAI Companion</span>
        <span className="font-mono">Click to insert</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {candidates.map((u) => (
          <button
            key={u.uid}
            type="button"
            onClick={() =>
              onSelectUsername(
                applyMentionAutocomplete(inputValue, u.displayName),
                u.displayName
              )
            }
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/5 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all"
          >
            <img
              src={u.photoURL}
              alt={u.displayName}
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover"
            />
            <span className="font-semibold" style={{ color: u.color }}>
              @{u.displayName}
            </span>
            <span className="text-[10px] text-slate-400">{u.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

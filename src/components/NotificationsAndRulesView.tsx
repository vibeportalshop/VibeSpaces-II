import React, { useState } from 'react';
import {
  Bell,
  Mail,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Download,
  Send,
  Zap,
} from 'lucide-react';
import { AppNotification, CustomNotificationRule, UserProfile } from '../types';
import { soundAndPush } from '../utils/soundAndPush';

interface NotificationsAndRulesViewProps {
  notifications: AppNotification[];
  rules: CustomNotificationRule[];
  onCreateRule: (
    rule: Omit<CustomNotificationRule, 'id' | 'createdAt' | 'triggeredCount'>
  ) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onMarkAllRead: () => void;
  onTriggerTestNotification: (title: string, body: string, spaceName?: string) => void;
  currentUser: UserProfile;
}

export const NotificationsAndRulesView: React.FC<NotificationsAndRulesViewProps> = ({
  notifications,
  rules,
  onCreateRule,
  onToggleRule,
  onDeleteRule,
  onMarkAllRead,
  onTriggerTestNotification,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'email_digest' | 'rules'>(
    'all'
  );
  const [pushStatus, setPushStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  // Rule Builder State
  const [ruleName, setRuleName] = useState('');
  const [conditionField, setConditionField] =
    useState<CustomNotificationRule['conditionField']>('keyword');
  const [conditionValue, setConditionValue] = useState('');
  const [action, setAction] =
    useState<CustomNotificationRule['action']>('email_digest');

  // Test Rule Simulator State
  const [testTitle, setTestTitle] = useState('New Admin Update in Vibe Cartel HQ');
  const [testBody, setTestBody] = useState(
    'Custom role permissions and weekly digest filters have been updated.'
  );

  const emailDigestItems = notifications.filter((n) => n.routedToEmailDigest);

  const handleEnableBrowserPush = async () => {
    const perm = await soundAndPush.requestPushPermission();
    setPushStatus(perm);
    if (perm === 'granted') {
      onTriggerTestNotification(
        'VibeSpaces Push Notifications Enabled',
        'You will now receive real-time web and mobile browser alerts.'
      );
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !conditionValue.trim()) return;
    onCreateRule({
      ownerId: currentUser.uid,
      name: ruleName.trim(),
      conditionField,
      conditionValue: conditionValue.trim(),
      action,
      enabled: true,
    });
    setRuleName('');
    setConditionValue('');
    soundAndPush.playEffect('pop');
  };

  const handleExportDigest = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(emailDigestItems, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `vibespaces-filtered-email-digest-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Web Push Permission Banner */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            Notifications, Filtered Email Digest & Custom Rules
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure real-time Web Push alerts, manage filtered email notification queues, and build automated IF/THEN rules directly in the interface.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEnableBrowserPush}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              pushStatus === 'granted'
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>
              {pushStatus === 'granted'
                ? 'Browser Push Active'
                : 'Enable Real-Time Push Alerts'}
            </span>
          </button>
          <button
            onClick={onMarkAllRead}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        {(
          [
            {
              id: 'all',
              label: `All Notifications (${notifications.length})`,
              icon: Bell,
            },
            {
              id: 'email_digest',
              label: `Filtered Email Digest Dashboard (${emailDigestItems.length})`,
              icon: Mail,
            },
            {
              id: 'rules',
              label: `Custom Interactive Rules (${rules.length})`,
              icon: Sliders,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-[#12121a] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: All Real-Time Notifications */}
      {activeSubTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-colors flex items-start justify-between gap-4 ${
                  !n.read
                    ? 'border-purple-500/40 bg-purple-500/[0.04]'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {n.sourceName}
                    </span>
                    {n.spaceName && (
                      <>
                        <span>·</span>
                        <span className="text-purple-400">{n.spaceName}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono">{n.createdAt}</span>
                    {n.priority === 'high' && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400 font-semibold">
                          Priority Alert
                        </span>
                      </>
                    )}
                    {n.routedToEmailDigest && (
                      <>
                        <span>·</span>
                        <span className="text-sky-400 font-medium">
                          Queued for Email Digest
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {n.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {n.body}
                  </p>
                  {n.matchedRuleName && (
                    <p className="text-[11px] text-emerald-400 pt-1">
                      Matched Custom Rule: "{n.matchedRuleName}"
                    </p>
                  )}
                </div>
                {!n.read && (
                  <span className="text-[11px] font-semibold text-purple-400 shrink-0">
                    New
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Live Notification & Rule Simulator */}
          <div className="lg:col-span-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Live Notification & Rule Tester
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate an incoming event to test your real-time push alerts and custom filtering rules.
              </p>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <textarea
                  rows={2}
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  placeholder="Notification Message Body"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <button
                  onClick={() =>
                    onTriggerTestNotification(
                      testTitle,
                      testBody,
                      'Vibe Cartel HQ'
                    )
                  }
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white"
                >
                  Dispatch Live Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Filtered Email Notification Dashboard */}
      {activeSubTab === 'email_digest' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Filtered Email Notification Digest Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Events matched by your custom email rules are cleanly aggregated here for zero-cost review and dispatch to{' '}
                <span className="font-mono text-purple-400">
                  {currentUser.email || 'co.vibecartel@gmail.com'}
                </span>
                .
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDigest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Digest JSON</span>
              </button>
              <a
                href={`mailto:${
                  currentUser.email || 'co.vibecartel@gmail.com'
                }?subject=${encodeURIComponent(
                  'VibeSpaces Filtered Notification Digest'
                )}&body=${encodeURIComponent(
                  emailDigestItems
                    .map((i) => `• ${i.title}: ${i.body} (${i.createdAt})`)
                    .join('\n\n')
                )}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Digest via Email Client</span>
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Event Summary</th>
                  <th className="py-3 px-4 font-semibold">Source / Space</th>
                  <th className="py-3 px-4 font-semibold">Matched Filter Rule</th>
                  <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {emailDigestItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.body}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.sourceName} {item.spaceName ? `· ${item.spaceName}` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-500 font-medium">
                      {item.matchedRuleName || 'Default Admin Digest'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-400">
                      {item.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Custom Rules Engine */}
      {activeSubTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Custom Rule Form */}
          <form
            onSubmit={handleAddRule}
            className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] space-y-4 h-fit"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Create Custom Rule
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define custom IF/THEN rules to automatically filter notifications, mute keywords, or route events to your email digest.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Route Synth Lab Drops to Email"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    IF Field
                  </label>
                  <select
                    value={conditionField}
                    onChange={(e) =>
                      setConditionField(
                        e.target.value as CustomNotificationRule['conditionField']
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="keyword">Contains Keyword</option>
                    <option value="space">From Channel Space</option>
                    <option value="author">From Author</option>
                    <option value="category">Event Type</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Matches Value
                  </label>
                  <input
                    type="text"
                    required
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="e.g. synth or admin"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  THEN Perform Action
                </label>
                <select
                  value={action}
                  onChange={(e) =>
                    setAction(e.target.value as CustomNotificationRule['action'])
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#181824] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="email_digest">
                    Route to Filtered Email Digest Dashboard
                  </option>
                  <option value="priority_push">
                    Trigger High-Priority Browser Push Alert
                  </option>
                  <option value="mute">Silently Mute Notification</option>
                  <option value="auto_flag">Auto-Flag for Admin Review</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-sky-500 text-white inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Active Rule</span>
            </button>
          </form>

          {/* Active Custom Rules List */}
          <div className="lg:col-span-7 space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        rule.enabled ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {rule.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    IF [{rule.conditionField}] contains "{rule.conditionValue}" → THEN [
                    {rule.action.replace('_', ' ').toUpperCase()}]
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Triggered {rule.triggeredCount} times · Created {rule.createdAt}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                    }`}
                  >
                    {rule.enabled ? 'Active' : 'Paused'}
                  </button>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

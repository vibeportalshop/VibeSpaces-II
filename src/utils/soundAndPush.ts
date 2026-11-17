import { AppNotification, CustomNotificationRule } from '../types';

class SoundAndPushEngine {
  private audioCtx: AudioContext | null = null;
  private ambientNodes: { stop: () => void } | null = null;
  public soundEnabled: boolean = localStorage.getItem('vs_sound') !== '0';

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('vs_sound', this.soundEnabled ? '1' : '0');
    if (!this.soundEnabled) {
      this.stopAmbient();
    }
    return this.soundEnabled;
  }

  public playEffect(type: 'pop' | 'send' | 'notify' | 'levelUp' | 'pin') {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'send') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'notify') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.09); // A5
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'levelUp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        osc.frequency.setValueAtTime(880, now + 0.24);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // Ignore audio autoplay block
    }
  }

  public startAmbientSoundscape(preset: 'lofi' | 'rain' | 'cosmic') {
    this.stopAmbient();
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const masterGain = ctx.createGain();

      filter.type = 'lowpass';
      masterGain.gain.setValueAtTime(0.025, ctx.currentTime);

      if (preset === 'lofi') {
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(220, ctx.currentTime); // A3 warm pad
        osc2.frequency.setValueAtTime(277.18, ctx.currentTime); // C#4
        filter.frequency.setValueAtTime(420, ctx.currentTime);
      } else if (preset === 'cosmic') {
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(110, ctx.currentTime); // Deep A2 drone
        osc2.frequency.setValueAtTime(164.81, ctx.currentTime); // E3 fifth
        filter.frequency.setValueAtTime(300, ctx.currentTime);
      } else {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(146.83, ctx.currentTime);
        osc2.frequency.setValueAtTime(220, ctx.currentTime);
        filter.frequency.setValueAtTime(260, ctx.currentTime);
      }

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientNodes = {
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
            osc1.disconnect();
            osc2.disconnect();
          } catch {
            // already stopped
          }
        },
      };
    } catch {
      // Ignore audio errors
    }
  }

  public stopAmbient() {
    if (this.ambientNodes) {
      this.ambientNodes.stop();
      this.ambientNodes = null;
    }
  }

  public async requestPushPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  }

  public evaluateRulesAndDispatch(
    rawNotif: Omit<AppNotification, 'priority' | 'routedToEmailDigest' | 'matchedRuleName'>,
    rules: CustomNotificationRule[]
  ): {
    notification: AppNotification;
    triggeredRuleId?: string;
  } {
    let priority: 'normal' | 'high' | 'muted' = 'normal';
    let routedToEmailDigest = false;
    let matchedRuleName: string | undefined;
    let triggeredRuleId: string | undefined;

    const textBlob = `${rawNotif.title} ${rawNotif.body}`.toLowerCase();

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const needle = rule.conditionValue.trim().toLowerCase();
      if (!needle) continue;

      let matches = false;
      if (rule.conditionField === 'keyword' && textBlob.includes(needle)) {
        matches = true;
      } else if (
        rule.conditionField === 'author' &&
        rawNotif.sourceName.toLowerCase().includes(needle)
      ) {
        matches = true;
      } else if (
        rule.conditionField === 'space' &&
        (rawNotif.spaceName || '').toLowerCase().includes(needle)
      ) {
        matches = true;
      } else if (
        rule.conditionField === 'category' &&
        rawNotif.type.toLowerCase().includes(needle)
      ) {
        matches = true;
      }

      if (matches) {
        matchedRuleName = rule.name;
        triggeredRuleId = rule.id;
        if (rule.action === 'mute') {
          priority = 'muted';
        } else if (rule.action === 'priority_push') {
          priority = 'high';
        } else if (rule.action === 'email_digest') {
          routedToEmailDigest = true;
          priority = 'high';
        } else if (rule.action === 'auto_flag') {
          priority = 'high';
        }
        break;
      }
    }

    const finalNotif: AppNotification = {
      ...rawNotif,
      priority,
      routedToEmailDigest,
      matchedRuleName,
    };

    if (priority !== 'muted') {
      this.playEffect('notify');
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(
            priority === 'high' ? `⚡ ${finalNotif.title}` : finalNotif.title,
            {
              body: finalNotif.body,
              icon: '/Spaces.png',
            }
          );
        } catch {
          // Ignore notification constructor limits in strict sandbox
        }
      }
    }

    return { notification: finalNotif, triggeredRuleId };
  }
}

export const soundAndPush = new SoundAndPushEngine();
